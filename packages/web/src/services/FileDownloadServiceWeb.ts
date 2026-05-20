import annotationFormatterFactory, {
    AnnotationType,
} from "../../../core/entity/AnnotationFormatter";
import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
} from "../../../core/services";
import { isMultiObjectFile } from "../../../core/services/S3StorageService";
import StreamedZipDownloader from "../entity/StreamedZipDownloader";
import Zarr from "../entity/Zarr";

export default class FileDownloadServiceWeb extends FileDownloadService {
    isFileSystemAccessible = false;

    // TODO: Test this in unit tests
    public static isLocalPath(filePath: string): boolean {
        const uriPattern = /^(https?|ftp):\/\/|^[a-zA-Z]:\\/;
        return filePath.startsWith("file://") || !uriPattern.test(filePath);
    }

    private static async fetchFileStream(path: string): Promise<ReadableStream<Uint8Array>> {
        const res = await fetch(path);
        if (!res.ok || !res.body) throw new Error(`Failed to get .zarr file at ${path}`);
        return res.body;
    }

    public download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        if (isMultiObjectFile(fileInfo.path)) {
            return this.downloadDirectory(fileInfo, downloadRequestId, onProgress, destination);
        }

        return this.downloadFile(fileInfo);
    }

    private downloadDirectory(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        if (FileDownloadServiceWeb.isLocalPath(fileInfo.path)) {
            return Promise.resolve(this.downloadLocalDirectory(fileInfo));
        }

        return this.downloadCloudDirectory(fileInfo, downloadRequestId, onProgress, destination);
    }

    private downloadLocalDirectory(fileInfo: FileInfo): DownloadResult {
        const directoryPath = fileInfo.path;
        const message = `The directory containing the Zarr file is located at: ${directoryPath}.
Due to security restrictions, the web browser cannot open this location directly. 
Please navigate to this directory manually, or upload files to a remote address such as S3.`;

        throw new Error(message);
    }

    private async downloadCloudDirectory(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        let totalBytesDownloaded = 0;
        const downloader = new StreamedZipDownloader(
            destination || fileInfo.name,
            (transferredBytes) => {
                totalBytesDownloaded += transferredBytes;
                onProgress?.(transferredBytes);
            }
        );

        // Register cancellation token for this request
        this.activeRequestMap[downloadRequestId] = {
            cancel: () => {
                void downloader.cancel();
            },
        };

        try {
            for await (const relativeInnerPath of this.getRelativePathsInDirectory(fileInfo.path)) {
                await downloader.addFile(relativeInnerPath, () =>
                    FileDownloadServiceWeb.fetchFileStream(`${fileInfo.path}/${relativeInnerPath}`)
                );
            }
            await downloader.end();
        } catch (error) {
            console.error(`Failed to download the files at ${fileInfo.path}`, error);
            await downloader.cancel();
            throw error;
        } finally {
            // Cleanup after download finishes
            delete this.activeRequestMap[downloadRequestId];
        }

        if (downloader.isCancelled) {
            return {
                downloadRequestId: fileInfo.id,
                msg: `Download of ${fileInfo.name} was cancelled.`,
                resolution: DownloadResolution.CANCELLED,
            };
        }

        // Consider it a failure if we didn't download the amount of bytes we were expected to
        if (fileInfo.size !== undefined && fileInfo.size !== totalBytesDownloaded) {
            const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);
            const fileSizeWithUnits = numberFormatter.displayValue(fileInfo.size, "bytes");
            const totalBytesDownloadedWithUnits = numberFormatter.displayValue(
                totalBytesDownloaded,
                "bytes"
            );
            throw new Error(
                `Expected to download ${fileSizeWithUnits}, instead downloaded ${totalBytesDownloadedWithUnits} (${fileInfo.size} vs ${totalBytesDownloaded}). This may indicate that some files either failed to download, couldn't be found, or were skipped.`
            );
        }

        return {
            downloadRequestId: fileInfo.id,
            msg: `Successfully downloaded ${fileInfo.name} and saved it as a ZIP file to ${
                destination || "your default downloads folder"
            }.`,
            resolution: DownloadResolution.SUCCESS,
        };
    }

    private async downloadFile(fileInfo: FileInfo): Promise<DownloadResult> {
        const data = fileInfo.data || fileInfo.path;
        let downloadUrl: string;

        if (data instanceof Uint8Array) {
            const dataBlob = new Uint8Array(data.byteLength);
            dataBlob.set(data);
            downloadUrl = URL.createObjectURL(new Blob([dataBlob]));
        } else if (data instanceof Blob) {
            downloadUrl = URL.createObjectURL(data);
        } else if (typeof data === "string") {
            // See if the data is a URL that needs to be formatted
            // this would be the case for S3 protocol URLs for example
            downloadUrl = (await this.s3StorageService.formatAsHttpResource(data)) || data;
        } else {
            throw new Error("Unsupported data type for download");
        }

        try {
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileInfo.name;
            a.target = "_blank";
            a.click();
            a.remove();
            console.debug(`File ${fileInfo.name} should start downloading...`);
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

    /**
     * Generator for getting relative paths of items inside the directory at the given path
     */
    private async *getRelativePathsInDirectory(path: string): AsyncGenerator<string> {
        const cloudDirInfo = await this.s3StorageService.getCloudDirectoryInfo(path);
        const { size, parsedUrl } = cloudDirInfo || {};

        // If able, use S3 listings to gather up files
        if (size && parsedUrl) {
            const objectsInDir = this.s3StorageService.getObjectsInDirectory(parsedUrl);
            for await (const objectInDir of objectsInDir) {
                const fileName = objectInDir.name.replace(`${parsedUrl?.key}/`, ""); // Local file name in zip
                yield fileName;
            }
        } else {
            // Otherwise, gather files based on knowledge we have of the file format itself

            if (!path.endsWith(".zarr") && !path.endsWith(".zarr/")) {
                // Error out if the format isn't supported yet
                throw new Error(
                    "Unable to access S3 parameter to dynamically download this directory like non-zarr file"
                );
            }

            const zarr = new Zarr(path);
            yield* zarr.getRelativeFilePaths();
        }
    }

    public getDefaultDownloadDirectory(): Promise<string> {
        throw new Error(
            "FileDownloadServiceWeb:getDefaultDownloadDirectory not implemented for web"
        );
    }
}
