import axios, { Canceler } from "axios";
import JSZip from "jszip";
import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
} from "../../../core/services";

interface ActiveRequestMap {
    [id: string]: {
        cancel: () => void;
    };
}

export default class FileDownloadServiceWeb extends FileDownloadService {
    isFileSystemAccessible = false;
    private readonly activeRequestMap: ActiveRequestMap = {};

    public async download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        if (fileInfo.path.endsWith(".zarr")) {
            return await this.handleZarrFile(fileInfo, downloadRequestId, onProgress, destination);
        } else {
            return await this.downloadFile(fileInfo);
        }
    }

    private async handleZarrFile(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        if (this.isS3Url(fileInfo.path)) {
            return await this.downloadS3Directory(
                fileInfo,
                downloadRequestId,
                onProgress,
                destination
            );
        }

        if (this.isLocalPath(fileInfo.path)) {
            return this.handleLocalZarrFile(fileInfo);
        }

        const message = `The file path "${fileInfo.path}" is not supported for Zarr downloads in the web environment. 
Only S3 URLs are supported. Please upload your files to an S3 bucket for web-based downloads.`;
        throw new Error(message);
    }

    private isLocalPath(filePath: string): boolean {
        const uriPattern = /^(https?|ftp):\/\/|^[a-zA-Z]:\\/;
        return filePath.startsWith("file://") || !uriPattern.test(filePath);
    }

    private handleLocalZarrFile(fileInfo: FileInfo): DownloadResult {
        const directoryPath = fileInfo.path;
        const message = `The directory containing the Zarr file is located at: ${directoryPath}.
Due to security restrictions, the web browser cannot open this location directly. 
Please navigate to this directory manually, or upload files to a remote address such as S3.`;

        alert(message);

        return {
            downloadRequestId: fileInfo.id,
            msg: `Download cancelled: the Zarr file is located locally at ${directoryPath}.`,
            resolution: DownloadResolution.CANCELLED,
        };
    }

    private async downloadS3Directory(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (transferredBytes: number) => void,
        destination?: string
    ): Promise<DownloadResult> {
        const { hostname, key } = this.parseS3Url(fileInfo.path);
        const keys = await this.listS3Objects(hostname, key);

        if (keys.length === 0) {
            throw new Error("No files found in the specified S3 directory.");
        }

        const zip = new JSZip();
        let totalSize = 0;

        // Fetch the size of each file to calculate total download size
        for (const fileKey of keys) {
            const fileUrl = `https://${hostname}/${encodeURIComponent(fileKey)}`;
            const response = await axios.head(fileUrl);
            const fileSize = parseInt(response.headers["content-length"] || "0", 10);
            totalSize += fileSize; // Calculate total size for all files
        }

        // Register cancellation token for this request
        let cancelToken: Canceler;
        this.activeRequestMap[downloadRequestId] = {
            cancel: () => cancelToken && cancelToken(),
        };

        // Download each file and add it to the ZIP archive
        for (const fileKey of keys) {
            const fileUrl = `https://${hostname}/${encodeURIComponent(fileKey)}`;
            const fileName = fileKey.replace(`${key}/`, ""); // Local file name in zip

            let fileBytesDownloaded = 0; // Track the bytes for the current file

            const response = await axios.get(fileUrl, {
                responseType: "blob",
                onDownloadProgress: (progressEvent) => {
                    const { loaded } = progressEvent;

                    // Calculate the number of new bytes downloaded since the last progress event
                    const newBytes = loaded - fileBytesDownloaded;
                    fileBytesDownloaded = loaded;

                    // Pass only the new bytes downloaded to onProgress
                    if (onProgress && totalSize > 0) {
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
            downloadUrl = data;
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
            console.log(`File ${fileInfo.name} should start downloading...`);
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

    public cancelActiveRequest(downloadRequestId: string): void {
        if (this.activeRequestMap[downloadRequestId]) {
            this.activeRequestMap[downloadRequestId].cancel();
            delete this.activeRequestMap[downloadRequestId];
        }
    }

    public getDefaultDownloadDirectory(): Promise<string> {
        throw new Error(
            "FileDownloadServiceWeb:getDefaultDownloadDirectory not implemented for web"
        );
    }
}
