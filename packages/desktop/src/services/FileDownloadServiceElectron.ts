import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";

import { Policy } from "cockatiel";
import { app, ipcMain, ipcRenderer } from "electron";

import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
    FileDownloadCancellationToken,
    HttpServiceBase,
} from "../../../core/services";
import { DownloadFailure } from "../../../core/errors";

// Maps active request ids (uuids) to request download info
interface ActiveRequestMap {
    [id: string]: {
        filePath: string;
        cancel: () => void;
        onProgress?: (bytes: number) => void;
    };
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

export default class FileDownloadServiceElectron
    extends HttpServiceBase
    implements FileDownloadService {
    // IPC events registered both within the main and renderer processes
    public static GET_FILE_SAVE_PATH = "get-file-save-path";
    public static GET_DOWNLOADS_DIR = "get-downloads-dir";
    public static SHOW_OPEN_DIALOG = "show-open-dialog-for-download";

    private readonly activeRequestMap: ActiveRequestMap = {};
    private readonly cancellationRequests: Set<string> = new Set();
    public readonly isFileSystemAccessible = true;

    public static registerIpcHandlers() {
        // Handler for returning where the downloads directory lives on this computer
        async function getDownloadsDirHandler() {
            return app.getPath("downloads");
        }
        ipcMain.handle(FileDownloadServiceElectron.GET_DOWNLOADS_DIR, getDownloadsDirHandler);
    }

    public async download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        let downloadUrl;
        if (fileInfo.data instanceof Uint8Array) {
            downloadUrl = URL.createObjectURL(new Blob([fileInfo.data]));
        } else if (fileInfo.data instanceof Blob) {
            downloadUrl = URL.createObjectURL(fileInfo.data);
        } else if (typeof fileInfo.data === "string") {
            const dataAsBlob = new Blob([fileInfo.data], { type: "application/json" });
            downloadUrl = URL.createObjectURL(dataAsBlob);
        } else {
            return this.downloadHttpFile(fileInfo, downloadRequestId, onProgress, destination);
        }

        try {
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileInfo.name;
            a.target = "_blank";
            a.click();
            a.remove();
            return {
                downloadRequestId: fileInfo.id,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err) {
            console.error(`Failed to download file: ${err}`);
            throw err;
        } finally {
            URL.revokeObjectURL(downloadUrl);
        }
    }

    private async downloadHttpFile(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ) {
        const fileSize = fileInfo.size || 0;

        destination = destination || (await this.getDefaultDownloadDirectory());
        if (destination === FileDownloadCancellationToken) {
            return {
                downloadRequestId,
                resolution: DownloadResolution.CANCELLED,
            };
        }
        const outFilePath = path.join(destination, fileInfo.name);
        const chunkSize = 1024 * 1024 * 5; // 5MB; arbitrary

        // retry policy: 3 times no matter the exception, with randomized exponential backoff between attempts
        const retry = Policy.handleAll().retry().attempts(3).exponential();
        let bytesDownloaded = -1;
        while (bytesDownloaded < fileSize) {
            const startByte = bytesDownloaded + 1;
            const endByte = Math.min(startByte + chunkSize - 1, fileSize);

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
                this.downloadOverHttp({
                    downloadRequestId,
                    outFilePath,
                    requestOptions: {
                        method: "GET",
                        headers: {
                            Range: `bytes=${startByte}-${endByte}`,
                        },
                    },
                    url: fileInfo.path,
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

    private async downloadOverHttp(options: DownloadOptions): Promise<DownloadResult> {
        const {
            downloadRequestId,
            encoding,
            postData,
            outFilePath,
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

    public prepareHttpResourceForDownload(url: string, postBody: string): Promise<object> {
        return this.rawPost(url, postBody);
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

    public getDefaultDownloadDirectory(): Promise<string> {
        return ipcRenderer.invoke(FileDownloadServiceElectron.GET_DOWNLOADS_DIR);
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
}
