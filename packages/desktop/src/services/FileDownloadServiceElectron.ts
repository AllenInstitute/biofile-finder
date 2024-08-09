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
import axios from "axios";
import { parseStringPromise } from "xml2js";

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
        let downloadUrl: string;

        if (fileInfo.path.endsWith(".zarr")) {
            const isS3Path = this.isS3Url(fileInfo.path);
            if (isS3Path) {
                return this.downloadS3Directory(
                    fileInfo,
                    downloadRequestId,
                    onProgress,
                    destination
                );
            }

            const isLocal = await this.isLocalPath(fileInfo.path);
            if (isLocal) {
                return this.copyLocalZarrDirectory(
                    fileInfo,
                    downloadRequestId,
                    onProgress,
                    destination
                );
            }

            throw new DownloadFailure(
                `Invalid path for Zarr file: ${fileInfo.path}`,
                downloadRequestId
            );
        }

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

    private isS3Url(url: string): boolean {
        try {
            const { protocol, hostname } = new URL(url);
            return protocol === "https:" && hostname.endsWith(".amazonaws.com");
        } catch (error) {
            return false;
        }
    }

    private async isLocalPath(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async copyLocalZarrDirectory(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        try {
            const destinationDir = destination || (await this.getDefaultDownloadDirectory());
            const fullDestinationDir = path.join(destinationDir, fileInfo.name);

            await this.copyDirectory(fileInfo.path, fullDestinationDir, onProgress);

            return {
                downloadRequestId: fileInfo.id,
                msg: `Successfully copied Zarr directory ${fileInfo.path} to ${fullDestinationDir}`,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err: unknown) {
            throw new DownloadFailure(
                `Failed to copy Zarr directory: ${(err as Error).message}`,
                downloadRequestId
            );
        }
    }

    private async copyDirectory(
        source: string,
        destination: string,
        onProgress?: (transferredBytes: number) => void
    ): Promise<void> {
        await fs.promises.mkdir(destination, { recursive: true });
        const entries = await fs.promises.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destinationPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(sourcePath, destinationPath, onProgress);
            } else {
                await fs.promises.copyFile(sourcePath, destinationPath);
                if (onProgress) {
                    const stats = await fs.promises.stat(sourcePath);
                    onProgress(stats.size);
                }
            }
        }
    }

    private async downloadHttpFile(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
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

    public async prepareHttpResourceForDownload(url: string, postBody: string): Promise<Blob> {
        const response = await this.rawPost<string>(url, postBody);
        return new Blob([response], { type: "application/json" });
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
        return new Promise<DownloadResult>((resolve, reject) => {
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
                    } catch (err: unknown) {
                        if (err instanceof Error) {
                            const formatted = `${err.name}: ${err.message}`;
                            errors.push(formatted);
                        }
                    } finally {
                        reject(new DownloadFailure(errors.join("<br />"), downloadRequestId));
                    }
                };

                incomingMsg.on("error", (err: Error) => {
                    cleanUp(err.message);
                });

                incomingMsg.on("aborted", () => {
                    cleanUp(`Download of ${outFilePath} aborted.`);
                });

                incomingMsg.on("timeout", () => {
                    cleanUp(`Download of ${outFilePath} timed out.`);
                });
            });

            req.on("error", async (err: unknown) => {
                delete this.activeRequestMap[downloadRequestId];
                // This first branch applies when the download has been explicitly cancelled
                if ((err as Error).message === FileDownloadCancellationToken) {
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
                                `Failed to download file: ${(err as Error).message}`,
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

    private async downloadS3Directory(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        const { bucket, key, region } = this.parseS3Url(fileInfo.path);
        const destinationDir = destination || (await this.getDefaultDownloadDirectory());
        const fullDestinationDir = path.join(destinationDir, fileInfo.name);

        try {
            // Ensure the destination directory exists
            fs.mkdirSync(fullDestinationDir, { recursive: true });

            const keys = await this.listS3Objects(bucket, key, region);

            if (keys.length === 0) {
                throw new Error("No files found in the specified S3 directory.");
            }

            for (const fileKey of keys) {
                if (!fileKey) {
                    console.warn(`Encountered null or undefined file key. Skipping.`);
                    continue;
                }

                const relativePath = path.relative(key, fileKey);
                const destinationPath = path.join(fullDestinationDir, relativePath);

                // Ensure the subdirectories exist
                fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

                const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(
                    fileKey
                )}`;

                await this.downloadS3File(fileUrl, destinationPath, onProgress);
            }

            return {
                downloadRequestId: fileInfo.id,
                msg: `Successfully downloaded ${fileInfo.path} to ${fullDestinationDir}`,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err: unknown) {
            console.error(`Failed to download directory: ${err}`);
            throw new DownloadFailure(
                `Failed to download directory: ${(err as Error).message}`,
                downloadRequestId
            );
        }
    }

    private async downloadS3File(
        url: string,
        destinationPath: string,
        onProgress?: (bytes: number) => void
    ) {
        const writer = fs.createWriteStream(destinationPath);

        return new Promise<void>((resolve, reject) => {
            const requestor = new URL(url).protocol === "http:" ? http : https;
            const req = requestor.get(url, (response) => {
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                }

                let downloadedLength = 0;

                response.on("data", (chunk: Buffer) => {
                    downloadedLength += chunk.length;
                    if (onProgress) {
                        onProgress(downloadedLength);
                    }
                });

                response.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            req.on("error", reject);
        });
    }

    public cancelActiveRequest(downloadRequestId: string): void {
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

    private parseS3Url(url: string): { bucket: string; key: string; region: string } {
        const { hostname, pathname } = new URL(url);
        const [bucket] = hostname.split(".");
        const key = pathname.slice(1);
        const region = hostname.split(".")[2];
        return { bucket, key, region };
    }

    private async listS3Objects(bucket: string, prefix: string, region: string): Promise<string[]> {
        const url = `https://${bucket}.s3.${region}.amazonaws.com?list-type=2&prefix=${encodeURIComponent(
            prefix
        )}`;
        const response = await axios.get(url);
        const parsedResult = await parseStringPromise(response.data);

        const contents = parsedResult.ListBucketResult.Contents || [];
        const keys: string[] = [];

        for (const content of contents) {
            const key = content.Key?.[0];
            if (typeof key === "string") {
                keys.push(key);
            }
        }

        return keys;
    }
}
