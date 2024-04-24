import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";

import { Policy } from "cockatiel";
import { app, dialog, FileFilter, ipcMain, IpcMainInvokeEvent, ipcRenderer } from "electron";

import { DownloadFailure } from "../../../core/errors";
import {
    FileDownloadService,
    FileDownloadCancellationToken,
    DownloadResolution,
    DownloadResult,
    FileInfo,
} from "../../../core/services";
import { FileDownloadServiceBaseUrl } from "../util/constants";
import NotificationServiceElectron from "./NotificationServiceElectron";

// Maps active request ids (uuids) to request download info
interface ActiveRequestMap {
    [id: string]: {
        filePath: string;
        cancel: () => void;
        onProgress?: (bytes: number) => void;
    };
}

interface ShowSaveDialogParams {
    title: string;
    defaultFileName: string;
    buttonLabel: string;
    filters?: FileFilter[];
}

interface WriteStreamOptions {
    flags: string;
    start?: number;
}

interface DownloadOptions {
    downloadRequestId: string;
    encoding?: BufferEncoding;
    outFilePath: string;
    postData?: string;
    requestOptions: http.RequestOptions | https.RequestOptions;
    url: string;
    writeStreamOptions: WriteStreamOptions;
}

export default class FileDownloadServiceElectron implements FileDownloadService {
    // IPC events registered both within the main and renderer processes
    public static GET_FILE_SAVE_PATH = "get-file-save-path";
    public static GET_DOWNLOADS_DIR = "get-downloads-dir";
    public static SHOW_OPEN_DIALOG = "show-open-dialog-for-download";

    private activeRequestMap: ActiveRequestMap = {};
    private cancellationRequests: Set<string> = new Set();
    private fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl;
    private notificationService: NotificationServiceElectron;

    public static registerIpcHandlers() {
        // Handler for displaying "Save as" prompt
        async function getSavePathHandler(_: IpcMainInvokeEvent, params: ShowSaveDialogParams) {
            return await dialog.showSaveDialog({
                title: params.title,
                defaultPath: path.resolve(app.getPath("downloads"), params.defaultFileName),
                buttonLabel: params.buttonLabel,
                filters: params.filters || [],
            });
        }
        ipcMain.handle(FileDownloadServiceElectron.GET_FILE_SAVE_PATH, getSavePathHandler);

        // Handler for opening a native file browser dialog
        async function getOpenDialogHandler(
            _: IpcMainInvokeEvent,
            dialogOptions: Electron.OpenDialogOptions
        ) {
            return dialog.showOpenDialog({
                defaultPath: path.resolve("/"),
                buttonLabel: "Select",
                ...dialogOptions,
            });
        }
        ipcMain.handle(FileDownloadServiceElectron.SHOW_OPEN_DIALOG, getOpenDialogHandler);

        // Handler for returning where the downloads directory lives on this computer
        async function getDownloadsDirHandler() {
            return app.getPath("downloads");
        }
        ipcMain.handle(FileDownloadServiceElectron.GET_DOWNLOADS_DIR, getDownloadsDirHandler);
    }

    private static async isDirectory(directoryPath: string): Promise<boolean> {
        try {
            // Check if path actually leads to a directory
            const pathStat = await fs.promises.stat(directoryPath);
            return pathStat.isDirectory();
        } catch (_) {
            return false;
        }
    }

    private static async isWriteable(path: string): Promise<boolean> {
        try {
            // Ensure folder is writeable by this user
            await fs.promises.access(path, fs.constants.W_OK);
            return true;
        } catch (_) {
            return false;
        }
    }

    constructor(
        notificationService: NotificationServiceElectron,
        fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl = FileDownloadServiceBaseUrl.PRODUCTION
    ) {
        this.notificationService = notificationService;
        this.fileDownloadServiceBaseUrl = fileDownloadServiceBaseUrl;
    }

    public async downloadFile(
        fileInfo: FileInfo,
        destination: string,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void
    ): Promise<DownloadResult> {
        const url = `${this.fileDownloadServiceBaseUrl}${fileInfo.path}`;

        const outFilePath = path.join(destination, fileInfo.name);
        const chunkSize = 1024 * 1024 * 5; // 5MB; arbitrary

        // retry policy: 3 times no matter the exception, with randomized exponential backoff between attempts
        const retry = Policy.handleAll().retry().attempts(3).exponential();
        let bytesDownloaded = -1;
        if (!fileInfo.size) {
            // TODO: INCLUDE IN TICKET - seems like this could just be handled by browser
            throw new Error("Unable to handle download without knowing file size");
        }
        while (bytesDownloaded < fileInfo.size) {
            const startByte = bytesDownloaded + 1;
            const endByte = Math.min(startByte + chunkSize - 1, fileInfo.size);

            let writeStreamOptions: WriteStreamOptions;
            if (startByte === 0) {
                // First request: ensure outfile is created if doesn't exist or truncated if it does
                writeStreamOptions = {
                    flags: "w",
                };
            } else {
                // Handle edge-case in which cancellation requested in-between range requests
                if (this.cancellationRequests.has(downloadRequestId)) {
                    this.cancellationRequests.delete(downloadRequestId);
                    await this.deleteArtifact(outFilePath);
                    return {
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    };
                }

                writeStreamOptions = {
                    // Open file for reading and writing. Required with use of `start` param.
                    flags: "r+",

                    // Start writing at this offset. Enables retrying chunks that may have failed
                    // part of the way through.
                    start: startByte,
                };
            }
            const result = await retry.execute(() =>
                this.download({
                    downloadRequestId,
                    outFilePath,
                    requestOptions: {
                        method: "GET",
                        headers: {
                            Range: `bytes=${startByte}-${endByte}`,
                        },
                    },
                    url,
                    writeStreamOptions,
                })
            );
            if (result.resolution !== DownloadResolution.SUCCESS) {
                return result;
            }
            if (onProgress) {
                onProgress(endByte - startByte + 1);
            }
            bytesDownloaded = endByte;
        }

        return {
            downloadRequestId,
            msg: `Successfully downloaded ${outFilePath}`,
            resolution: DownloadResolution.SUCCESS,
        };
    }

    public async promptForSaveLocation(
        title: string,
        defaultFileName: string,
        buttonLabel: string,
        filters?: Record<string, any>[]
    ): Promise<string> {
        const result = await ipcRenderer.invoke(FileDownloadServiceElectron.GET_FILE_SAVE_PATH, {
            title,
            defaultFileName,
            buttonLabel,
            filters,
        });

        if (result.canceled) {
            return FileDownloadCancellationToken;
        }

        return result.filePath;
    }

    public async downloadCsvManifest(
        url: string,
        postData: string,
        downloadRequestId: string
    ): Promise<DownloadResult> {
        const result = await this.promptForSaveLocation(
            "Save CSV manifest",
            "fms-explorer-selections.csv",
            "Save manifest",
            [{ name: "CSV files", extensions: ["csv"] }]
        );

        if (result === FileDownloadCancellationToken) {
            return Promise.resolve({
                downloadRequestId,
                resolution: DownloadResolution.CANCELLED,
            });
        }

        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
            },
        };

        // On Windows (at least) you have to self-append the file extension when overwriting the name
        // I imagine this is not something a lot of people think to do (and is kind of inconvenient)
        // - Sean M 08/20/20
        const outFilePath = result.endsWith(".csv") ? result : result + ".csv";

        return this.download({
            downloadRequestId,
            encoding: "utf-8",
            outFilePath,
            postData,
            requestOptions,
            url,
            writeStreamOptions: { flags: "w" }, // The file is created (if it does not exist) or truncated (if it exists).
        });
    }

    public async promptForDownloadDirectory(): Promise<string> {
        const title = "Select download directory";

        // Continuously try to set a valid directory location until the user cancels
        while (true) {
            const defaultDownloadDirectory = await this.getDefaultDownloadDirectory();
            const directoryPath = await this.promptUserWithDialog({
                title,
                properties: ["openDirectory"],
                defaultPath: defaultDownloadDirectory,
            });

            if (directoryPath === FileDownloadCancellationToken) {
                return FileDownloadCancellationToken;
            }

            const isDirectory = await FileDownloadServiceElectron.isDirectory(directoryPath);
            const isWriteable =
                isDirectory && (await FileDownloadServiceElectron.isWriteable(directoryPath));

            // If the directory has passed validation, return
            if (isDirectory && isWriteable) {
                return directoryPath;
            }

            // Otherwise if the directory failed validation, alert
            // user to error with executable location
            let errorMessage = `Whoops! ${directoryPath} is not verifiably a directory on your computer.`;
            if (isDirectory && !isWriteable) {
                errorMessage += ` Directory does not appear to be writeable by the current user.`;
            }
            await this.notificationService.showError(title, errorMessage);
        }
    }

    public getDefaultDownloadDirectory(): Promise<string> {
        return ipcRenderer.invoke(FileDownloadServiceElectron.GET_DOWNLOADS_DIR);
    }

    public cancelActiveRequest(downloadRequestId: string) {
        this.cancellationRequests.add(downloadRequestId);
        if (!this.activeRequestMap.hasOwnProperty(downloadRequestId)) {
            return;
        }

        const { cancel } = this.activeRequestMap[downloadRequestId];
        cancel();
        delete this.activeRequestMap[downloadRequestId];
    }

    private download(options: DownloadOptions): Promise<DownloadResult> {
        const {
            downloadRequestId,
            encoding,
            outFilePath,
            postData,
            requestOptions,
            url,
            writeStreamOptions,
        } = options;
        return new Promise((resolve, reject) => {
            // HTTP requests are made when pointed at localhost, HTTPS otherwise. If that ever changes,
            // this logic can be safely removed.
            const requestor = new URL(url).protocol === "http:" ? http : https;

            const req = requestor.request(url, requestOptions, (incomingMsg) => {
                if (encoding) {
                    incomingMsg.setEncoding(encoding);
                }

                const outFileStream = fs.createWriteStream(outFilePath, writeStreamOptions);

                if (incomingMsg.statusCode !== undefined && incomingMsg.statusCode >= 400) {
                    const errorChunks: string[] = [];
                    incomingMsg.on("data", (chunk: string) => {
                        errorChunks.push(chunk);
                    });
                    incomingMsg.on("end", async () => {
                        try {
                            delete this.activeRequestMap[downloadRequestId];
                            await this.deleteArtifact(outFilePath);
                        } finally {
                            const error = errorChunks.join("");
                            const msg = `Failed to download ${outFilePath}. Error details: ${error}`;
                            reject(new DownloadFailure(msg, downloadRequestId));
                        }
                    });
                } else {
                    incomingMsg.on("end", async () => {
                        delete this.activeRequestMap[downloadRequestId];
                        if (incomingMsg.aborted) {
                            try {
                                await this.deleteArtifact(outFilePath);
                            } finally {
                                resolve({
                                    downloadRequestId,
                                    resolution: DownloadResolution.CANCELLED,
                                });
                            }
                        } else {
                            resolve({
                                downloadRequestId,
                                msg: `Successfully downloaded ${outFilePath}`,
                                resolution: DownloadResolution.SUCCESS,
                            });
                        }
                    });

                    incomingMsg.pipe(outFileStream);
                }

                const cleanUp = async (sourceErrorMessage: string) => {
                    const errors = [sourceErrorMessage];
                    try {
                        delete this.activeRequestMap[downloadRequestId];

                        // Need to manually close outFileStream if attached read stream
                        // (i.e., `incomingMsg`) ends with error
                        await new Promise<void>((resolve, reject) =>
                            outFileStream.end((err: Error) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            })
                        );
                        await this.deleteArtifact(outFilePath);
                    } catch (err) {
                        if (err instanceof Error) {
                            const formatted = `${err.name}: ${err.message}`;
                            errors.push(formatted);
                        }
                    } finally {
                        reject(new DownloadFailure(errors.join("<br />"), downloadRequestId));
                    }
                };

                incomingMsg.on("error", (err) => {
                    cleanUp(err.message);
                });

                incomingMsg.on("aborted", () => {
                    cleanUp(`Download of ${outFilePath} aborted.`);
                });

                incomingMsg.on("timeout", () => {
                    cleanUp(`Download of ${outFilePath} timed out.`);
                });
            });

            req.on("error", async (err) => {
                delete this.activeRequestMap[downloadRequestId];
                // This first branch applies when the download has been explicitly cancelled
                if (err.message === FileDownloadCancellationToken) {
                    resolve({
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                } else {
                    try {
                        await this.deleteArtifact(outFilePath);
                    } finally {
                        reject(
                            new DownloadFailure(
                                `Failed to download file: ${err.message}`,
                                downloadRequestId
                            )
                        );
                    }
                }
            });

            this.activeRequestMap[downloadRequestId] = {
                cancel: () => {
                    if (this.cancellationRequests.has(downloadRequestId)) {
                        this.cancellationRequests.delete(downloadRequestId);
                    }
                    req.destroy(new Error(FileDownloadCancellationToken));
                },
                filePath: outFilePath,
            };
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    /**
     * If a downloaded artifact (partial or otherwise) exists, delete it
     */
    private deleteArtifact(filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                // No error or file doesn't exist (e.g., already cleaned up)
                if (!err || err.code === "ENOENT") {
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    // Prompts user using native file browser for a file path
    private async promptUserWithDialog(dialogOptions: Electron.OpenDialogOptions): Promise<string> {
        const result = await ipcRenderer.invoke(
            FileDownloadServiceElectron.SHOW_OPEN_DIALOG,
            dialogOptions
        );
        if (result.canceled || !result.filePaths.length) {
            return FileDownloadCancellationToken;
        }
        return result.filePaths[0];
    }
}
