import axios, { Canceler } from "axios";
import JSZip from "jszip";
import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
} from "../../../core/services";
import { MAX_DOWNLOAD_SIZE_WEB } from "../../../core/services/FileDownloadService";

export default class FileDownloadServiceWeb extends FileDownloadService {
    isFileSystemAccessible = false;

    // TODO: Test this in unit tests
    public static isLocalPath(filePath: string): boolean {
        const uriPattern = /^(https?|ftp):\/\/|^[a-zA-Z]:\\/;
        return filePath.startsWith("file://") || !uriPattern.test(filePath);
    }

    public download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        if (FileDownloadService.isZarr(fileInfo.path)) {
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
        const cloudDirInfo = await this.getCloudDirectoryInfo(fileInfo.path);
        if (!cloudDirInfo) {
            throw new Error(
                `Unable to determine size of directory at "${fileInfo.path}".
                This may happen if the path is of a cloud format we are unfamiliar with.`
            );
        }
        const { size, parsedUrl } = cloudDirInfo;

        // Check if the total size exceeds 2 GB.
        // Most modern web browsers have memory constraints that limit them to using approximately 2 GB of RAM.
        // Exceeding this limit can cause memory issues, crashes, or download failures due to insufficient memory.
        // This check ensures that the total download size does not surpass the supported 2 GB threshold.
        // Additionally, zarr size is calculated using the same traversal method as downloads,
        // meaning that if the size cannot be determined, the download is also not possible.
        if (size > MAX_DOWNLOAD_SIZE_WEB) {
            throw new Error(
                `The total download size of the requested zarr file exceeds the 2 GB RAM limit supported by web browsers. ` +
                    `Attempting to download a total size of ${(size / (1024 * 1024 * 1024)).toFixed(
                        2
                    )} GB can lead to ` +
                    `browser memory issues, potential crashes, or failed downloads.`
            );
        }

        const keys = await this.listS3Objects(parsedUrl);
        if (keys.length === 0) {
            throw new Error("No files found in the specified S3 directory.");
        }

        const zip = new JSZip();

        // Register cancellation token for this request
        let cancelToken: Canceler;
        this.activeRequestMap[downloadRequestId] = {
            cancel: () => cancelToken && cancelToken("Download cancelled by user"),
        };

        // Download each file and add it to the ZIP archive
        for (const fileKey of keys) {
            const fileUrl = FileDownloadService.formatUrlAsFileResource({
                ...parsedUrl,
                key: fileKey,
            });
            const fileName = fileKey.replace(`${parsedUrl.key}/`, ""); // Local file name in zip

            let fileBytesDownloaded = 0; // Track the bytes for the current file

            const response = await axios.get(fileUrl, {
                responseType: "blob",
                onDownloadProgress: (progressEvent) => {
                    const { loaded } = progressEvent;

                    // Calculate the number of new bytes downloaded since the last progress event
                    const newBytes = loaded - fileBytesDownloaded;
                    fileBytesDownloaded = loaded;

                    // Pass only the new bytes downloaded to onProgress
                    if (onProgress && size > 0) {
                        onProgress(newBytes);
                    }
                },
                cancelToken: new axios.CancelToken((c) => {
                    cancelToken = c;
                }),
            });

            zip.file(fileName, response.data);
        }

        // Cleanup after download finishes
        delete this.activeRequestMap[downloadRequestId];

        // Generate ZIP Blob and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");

        // Use destination or default name if destination is passed
        a.href = downloadUrl;
        a.download = destination || `${fileInfo.name}.zip`;
        a.click();
        URL.revokeObjectURL(downloadUrl);

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
            downloadUrl = URL.createObjectURL(new Blob([data]));
        } else if (data instanceof Blob) {
            downloadUrl = URL.createObjectURL(data);
        } else if (typeof data === "string") {
            // See if the data is a URL that needs to be formatted
            // this would be the case for S3 protocol URLs for example
            const parsedUrl = await this.parseUrl(data);
            downloadUrl = parsedUrl ? FileDownloadService.formatUrlAsFileResource(parsedUrl) : data;
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

    public getDefaultDownloadDirectory(): Promise<string> {
        throw new Error(
            "FileDownloadServiceWeb:getDefaultDownloadDirectory not implemented for web"
        );
    }
}
