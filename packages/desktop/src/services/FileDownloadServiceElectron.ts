import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";

import { Policy } from "cockatiel";
import { app, ipcMain, ipcRenderer } from "electron";

import {
    DownloadResult,
    FileDownloadService,
    FileInfo,
    DownloadResolution,
    FileDownloadCancellationToken,
} from "../../../core/services";
import { DownloadFailure } from "../../../core/errors";

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

export default class FileDownloadServiceElectron extends FileDownloadService {
    // IPC events registered both within the main and renderer processes
    public static GET_FILE_SAVE_PATH = "get-file-save-path";
    public static GET_DOWNLOADS_DIR = "get-downloads-dir";
    public static SHOW_OPEN_DIALOG = "show-open-dialog-for-download";
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

        if (FileDownloadService.isZarr(fileInfo.path)) {
            return (await this.isLocalPath(fileInfo.path))
                ? this.copyDirectory(fileInfo, downloadRequestId, onProgress, destination)
                : this.downloadCloudDirectory(fileInfo, downloadRequestId, onProgress, destination);
        }

        const path = fileInfo.data || fileInfo.path;
        if (path instanceof Uint8Array) {
            downloadUrl = URL.createObjectURL(new Blob([path]));
        } else if (path instanceof Blob) {
            downloadUrl = URL.createObjectURL(path);
        } else if (typeof path === "string" && !destination) {
            const dataAsBlob = new Blob([path], { type: "application/json" });
            downloadUrl = URL.createObjectURL(dataAsBlob);
            // if the string is a url, download directly from that url
            const isValidURL = (path: string) => {
                try {
                    new URL(path);
                    return true;
                } catch {
                    return false;
                }
            };
            if (isValidURL(path)) {
                downloadUrl = path;
            }
        } else {
            // return this.downloadCloudFile(fileInfo.path, onProgress, destination);
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

    private async isLocalPath(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async copyDirectory(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        try {
            const destinationDir = destination || (await this.getDefaultDownloadDirectory());
            const fullDestinationDir = path.join(destinationDir, fileInfo.name);

            await this.copyDirectoryRecursive(fileInfo.path, fullDestinationDir, onProgress);

            return {
                downloadRequestId: fileInfo.id,
                msg: `Successfully copied Zarr directory ${fileInfo.path} to ${fullDestinationDir}`,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err) {
            throw new DownloadFailure(
                `Failed to copy Zarr directory: ${(err as Error).message}`,
                downloadRequestId
            );
        }
    }

    private async copyDirectoryRecursive(
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
                await this.copyDirectoryRecursive(sourcePath, destinationPath, onProgress);
            } else {
                await fs.promises.copyFile(sourcePath, destinationPath);
                if (onProgress) {
                    const stats = await fs.promises.stat(sourcePath);
                    onProgress(stats.size);
                }
            }
        }
    }

    // TODO :This vs ... downloadCloudFile
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
                        if (incomingMsg.destroyed) {
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

            req.on("error", async (err) => {
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

    private async downloadCloudDirectory(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        const cloudDirInfo = await this.getCloudDirectoryInfo(fileInfo.path);
        if (!cloudDirInfo) {
            throw new DownloadFailure(
                `Unable to determine size of ${fileInfo.path}. Currently only support AWS S3 or locally stored files.`,
                downloadRequestId
            );
        }
        const { parsedUrl, size } = cloudDirInfo;

        destination = destination || (await this.getDefaultDownloadDirectory());

        if (destination === FileDownloadCancellationToken) {
            return {
                downloadRequestId,
                resolution: DownloadResolution.CANCELLED,
            };
        }
        const fullDestination = path.join(destination, fileInfo.name);

        try {
            // Backfill missing directories from path.
            fs.mkdirSync(fullDestination, { recursive: true });

            const keys = await this.listS3Objects(parsedUrl);

            if (keys.length === 0) {
                throw new Error("No files found in the specified S3 directory.");
            }

            let cancelRequested = false;

            // Register cancellation token for this request
            this.activeRequestMap[downloadRequestId] = {
                filePath: fullDestination,
                cancel: () => {
                    cancelRequested = true;
                },
            };

            // Download each file, track its size, and report progress
            for (const fileKey of keys) {
                // If cancel was requested, cleanup.
                if (cancelRequested) {
                    await fs.promises.rm(fullDestination, { recursive: true, force: true });
                    throw new DownloadFailure(`Download cancelled by user.`, downloadRequestId);
                }

                const relativePath = path.relative(parsedUrl.key, fileKey);
                const destinationPath = path.join(fullDestination, relativePath);
                const fileUrl = FileDownloadService.formatUrlAsFileResource({
                    ...parsedUrl,
                    key: fileKey,
                });

                // Backfill missing directories from path.
                fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

                // Download the file and update the downloaded size
                await this.downloadCloudFile(fileUrl, destinationPath, (fileDownloadedBytes) => {
                    if (onProgress && size > 0) {
                        onProgress(fileDownloadedBytes);
                    }
                });

                // If cancel was requested, cleanup.
                if (cancelRequested) {
                    await fs.promises.rm(fullDestination, { recursive: true, force: true });
                    throw new DownloadFailure(`Download cancelled by user.`, downloadRequestId);
                }
            }

            // Cleanup after successful download
            delete this.activeRequestMap[downloadRequestId];

            return {
                downloadRequestId: fileInfo.id,
                msg: `Successfully downloaded ${fileInfo.path} to ${fullDestination}`,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err) {
            delete this.activeRequestMap[downloadRequestId];

            // If cancel was requested, cleanup.
            await fs.promises.rm(fullDestination, { recursive: true, force: true });
            throw new DownloadFailure(
                `Failed to download directory: ${(err as Error).message}`,
                downloadRequestId
            );
        }
    }

    private async downloadCloudFile(
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

                response.on("data", (chunk: Buffer) => {
                    // Report chunk size progress
                    if (onProgress) {
                        onProgress(chunk.length);
                    }
                });

                response.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            req.on("error", reject);
        });
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
