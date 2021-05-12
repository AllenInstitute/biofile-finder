import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";

import {
    app,
    dialog,
    FileFilter,
    ipcMain,
    IpcMainInvokeEvent,
    ipcRenderer,
    IpcRendererEvent,
} from "electron";

import { FileDownloadService, DownloadResolution, DownloadResult } from "../../../core/services";
import { FileDownloadServiceBaseUrl } from "../util/constants";
import ElectronDownloader, { ElectronDownloadResolution } from "./ElectronDownloader";

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

interface DownloadParams {
    downloadRequestId: string;
    url: string;
    outFilePath: string;
    requestOptions: http.RequestOptions | https.RequestOptions;
    postData?: string;
    encoding?: BufferEncoding;
    onProgress?: (totalBytesDownloaded: number) => void;
}

export default class FileDownloadServiceElectron implements FileDownloadService {
    public static GET_FILE_SAVE_PATH = "get-file-save-path";
    public static DOWNLOAD_FROM_URL = "download-from-url";
    public static PAUSE_DOWNLOAD = "pause-download";
    public static CANCEL_DOWNLOAD = "cancel-download";
    public static REPORT_DOWNLOAD_PROGRESS = "report-download-progress";

    private CANCELLATION_TOKEN = "CANCEL";
    private activeRequestMap: ActiveRequestMap = {};
    private fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl;

    public static registerIpcHandlers() {
        async function getSavePathHandler(_: IpcMainInvokeEvent, params: ShowSaveDialogParams) {
            return await dialog.showSaveDialog({
                title: params.title,
                defaultPath: path.resolve(app.getPath("downloads"), params.defaultFileName),
                buttonLabel: params.buttonLabel,
                filters: params.filters || [],
            });
        }
        ipcMain.handle(FileDownloadServiceElectron.GET_FILE_SAVE_PATH, getSavePathHandler);

        const downloader = new ElectronDownloader();
        async function downloadHandler(
            event: IpcMainInvokeEvent,
            url: string,
            fileName: string,
            downloadRequestId: string
        ) {
            function onProgress(progress: number) {
                event.sender.send(FileDownloadServiceElectron.REPORT_DOWNLOAD_PROGRESS, progress);
            }

            const downloadsDir = app.getPath("downloads");
            const filePath = path.join(downloadsDir, fileName);
            const resolution = await downloader.download(event.sender.session, url, {
                filePath,
                onProgress,
                uid: downloadRequestId,
            });
            if (resolution === ElectronDownloadResolution.COMPLETED) {
                return {
                    downloadRequestId,
                    msg: `Successfully downloaded ${filePath}`,
                    resolution: DownloadResolution.SUCCESS,
                };
            } else if (resolution === ElectronDownloadResolution.CANCELLED) {
                return {
                    downloadRequestId,
                    resolution: DownloadResolution.CANCELLED,
                };
            }
        }
        ipcMain.handle(FileDownloadServiceElectron.DOWNLOAD_FROM_URL, downloadHandler);

        function downloadCancelHandler(_event: IpcMainInvokeEvent, uid: string) {
            downloader.cancelDownload(uid);
        }
        ipcMain.handle(FileDownloadServiceElectron.CANCEL_DOWNLOAD, downloadCancelHandler);
    }

    constructor(
        fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl = FileDownloadServiceBaseUrl.PRODUCTION
    ) {
        this.fileDownloadServiceBaseUrl = fileDownloadServiceBaseUrl;

        this.reportProgress = this.reportProgress.bind(this);
        ipcRenderer.on(FileDownloadServiceElectron.REPORT_DOWNLOAD_PROGRESS, this.reportProgress);
    }

    public async downloadFile(
        filePath: string,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void
    ): Promise<DownloadResult> {
        const url = `${this.fileDownloadServiceBaseUrl}${filePath}`;
        this.activeRequestMap[downloadRequestId] = {
            cancel: () => {
                ipcRenderer.invoke(FileDownloadServiceElectron.CANCEL_DOWNLOAD, downloadRequestId);
            },
            filePath,
            onProgress,
        };

        try {
            const fileName = path.basename(filePath);
            return await ipcRenderer.invoke(
                FileDownloadServiceElectron.DOWNLOAD_FROM_URL,
                url,
                fileName,
                downloadRequestId
            );
        } catch (err) {
            return {
                downloadRequestId,
                msg: err.message,
                resolution: DownloadResolution.FAILURE,
            };
        }
    }

    public async downloadCsvManifest(
        url: string,
        postData: string,
        downloadRequestId: string
    ): Promise<DownloadResult> {
        const saveDialogParams = {
            title: "Save CSV manifest",
            defaultFileName: "fms-explorer-selections.csv",
            buttonLabel: "Save manifest",
            filters: [{ name: "CSV files", extensions: ["csv"] }],
        };
        const result = await ipcRenderer.invoke(
            FileDownloadServiceElectron.GET_FILE_SAVE_PATH,
            saveDialogParams
        );

        if (result.canceled) {
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
        const outFilePath = result.filePath.endsWith(".csv")
            ? result.filePath
            : result.filePath + ".csv";

        return this.download({
            downloadRequestId,
            url,
            outFilePath,
            requestOptions,
            postData,
            encoding: "utf-8",
        });
    }

    public async cancelActiveRequest(downloadRequestId: string): Promise<void> {
        if (!this.activeRequestMap.hasOwnProperty(downloadRequestId)) {
            return Promise.resolve();
        }

        const { filePath, cancel } = this.activeRequestMap[downloadRequestId];
        cancel();
        delete this.activeRequestMap[downloadRequestId];
        return this.deleteArtifact(filePath);
    }

    private reportProgress(
        _event: IpcRendererEvent,
        downloadRequestId: string,
        transferredBytes: number
    ): void {
        const { onProgress } = this.activeRequestMap[downloadRequestId] || {};

        if (onProgress) {
            onProgress(transferredBytes);
        }
    }

    /**
     * If a downloaded artifact (partial or otherwise) exists, delete it
     */
    private deleteArtifact(filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (!err) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            resolve();
                        } else {
                            reject(err);
                        }
                    });
                } else {
                    resolve(); // File does not exist
                }
            });
        });
    }

    private async download(params: DownloadParams): Promise<DownloadResult> {
        const { downloadRequestId, url, outFilePath, requestOptions, postData, encoding } = params;

        return new Promise((resolve, reject) => {
            // HTTP requests are made when pointed at localhost, HTTPS otherwise. If that ever changes,
            // this logic can be safely removed.
            const requestor = new URL(url).protocol === "http:" ? http : https;

            const req = requestor.request(url, requestOptions, (incomingMsg) => {
                if (encoding) {
                    incomingMsg.setEncoding(encoding);
                }

                incomingMsg.on("aborted", async () => {
                    try {
                        delete this.activeRequestMap[downloadRequestId];
                        await this.deleteArtifact(outFilePath);
                    } finally {
                        console.error("aborted");
                        reject({
                            downloadRequestId,
                            msg: "Aborted",
                            resolution: DownloadResolution.FAILURE,
                        });
                    }
                });

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
                            const msg = `Failed to download file. Error details: ${error}`;
                            console.error(msg);
                            reject({
                                downloadRequestId,
                                msg,
                                resolution: DownloadResolution.FAILURE,
                            });
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
                    incomingMsg.on("error", async (err) => {
                        try {
                            delete this.activeRequestMap[downloadRequestId];
                            await this.deleteArtifact(outFilePath);
                        } finally {
                            console.error(err);
                            reject({
                                downloadRequestId,
                                msg: err.message,
                                resolution: DownloadResolution.FAILURE,
                            });
                        }
                    });

                    const writeStream = fs.createWriteStream(outFilePath);
                    incomingMsg.pipe(writeStream);
                }
            });

            req.on("error", async (err) => {
                console.error(err);
                delete this.activeRequestMap[downloadRequestId];
                // This first branch applies when the download has been explicitly cancelled
                if (err.message === this.CANCELLATION_TOKEN) {
                    resolve({
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                } else {
                    try {
                        await this.deleteArtifact(outFilePath);
                    } finally {
                        reject({
                            downloadRequestId,
                            msg: `Failed to download file. Error details: ${err}`,
                            resolution: DownloadResolution.FAILURE,
                        });
                    }
                }
            });

            this.activeRequestMap[downloadRequestId] = {
                cancel: () => {
                    req.destroy(new Error(this.CANCELLATION_TOKEN));
                },
                filePath: outFilePath,
            };
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }
}
