import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";
import * as stream from "stream";

import { app, dialog, FileFilter, ipcMain, IpcMainInvokeEvent, ipcRenderer } from "electron";

import { FileDownloadService, DownloadResolution, DownloadResult } from "../../../core/services";
import { FileDownloadServiceBaseUrl } from "../util/constants";

// Maps active request ids (uuids) to request download info
interface ActiveRequestMap {
    [id: string]: {
        filePath: string;
        request: http.ClientRequest;
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
    responseEncoding?: BufferEncoding;
    onProgress?: (totalBytesDownloaded: number) => void;
}

export default class FileDownloadServiceElectron implements FileDownloadService {
    public static GET_FILE_SAVE_PATH = "get-file-save-path";
    private CANCELLATION_TOKEN = "CANCEL";
    private activeRequestMap: ActiveRequestMap = {};
    private fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl;

    public static registerIpcHandlers() {
        async function handler(_: IpcMainInvokeEvent, params: ShowSaveDialogParams) {
            return await dialog.showSaveDialog({
                title: params.title,
                defaultPath: path.resolve(app.getPath("downloads"), params.defaultFileName),
                buttonLabel: params.buttonLabel,
                filters: params.filters || [],
            });
        }
        ipcMain.handle(FileDownloadServiceElectron.GET_FILE_SAVE_PATH, handler);
    }

    constructor(
        fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl = FileDownloadServiceBaseUrl.PRODUCTION
    ) {
        this.fileDownloadServiceBaseUrl = fileDownloadServiceBaseUrl;
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
            responseEncoding: "utf-8",
        });
    }

    public async downloadFile(
        filePath: string,
        downloadRequestId: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult> {
        const saveDialogParams = {
            title: "Save file",
            defaultFileName: path.basename(filePath),
            buttonLabel: "Save",
        };
        const promptResult = await ipcRenderer.invoke(
            FileDownloadServiceElectron.GET_FILE_SAVE_PATH,
            saveDialogParams
        );

        if (promptResult.canceled) {
            return Promise.resolve({
                downloadRequestId,
                resolution: DownloadResolution.CANCELLED,
            });
        }

        const requestOptions = {
            method: "GET",
        };

        const outFilePath = path.extname(promptResult.filePath)
            ? promptResult.filePath
            : `${promptResult.filePath}.${path.extname(filePath)}`;

        const url = `${this.fileDownloadServiceBaseUrl}${filePath}`;
        return this.download({ downloadRequestId, url, outFilePath, requestOptions, onProgress });
    }

    public async cancelActiveRequest(downloadRequestId: string): Promise<void> {
        if (!this.activeRequestMap.hasOwnProperty(downloadRequestId)) {
            return Promise.resolve();
        }
        const { filePath, request } = this.activeRequestMap[downloadRequestId];
        request.destroy(new Error(this.CANCELLATION_TOKEN));
        delete this.activeRequestMap[downloadRequestId];
        return this.deleteArtifact(filePath);
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
        const {
            downloadRequestId,
            url,
            outFilePath,
            requestOptions,
            postData,
            responseEncoding,
            onProgress,
        } = params;

        return new Promise((resolve, reject) => {
            // HTTP requests are made when pointed at localhost, HTTPS otherwise. If that ever changes,
            // this logic can be safely removed.
            const requestor = new URL(url).protocol === "http:" ? http : https;

            const req = requestor.request(url, requestOptions, (incomingMsg) => {
                if (responseEncoding) {
                    incomingMsg.setEncoding(responseEncoding);
                }

                incomingMsg.on("aborted", () => {
                    console.error("aborted!");
                    console.log(incomingMsg);
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
                            reject({
                                downloadRequestId,
                                msg: err.message,
                                resolution: DownloadResolution.FAILURE,
                            });
                        }
                    });

                    const writeStream = fs.createWriteStream(outFilePath);
                    if (onProgress) {
                        const progressTrackingStream = new stream.Transform({
                            transform(chunk, encoding, callback) {
                                onProgress(chunk.byteLength);
                                callback(null, chunk);
                            },
                        });
                        incomingMsg.pipe(progressTrackingStream).pipe(writeStream);
                    } else {
                        incomingMsg.pipe(writeStream);
                    }
                }
            });

            req.on("error", async (err) => {
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

            this.activeRequestMap[downloadRequestId] = { filePath: outFilePath, request: req };
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }
}
