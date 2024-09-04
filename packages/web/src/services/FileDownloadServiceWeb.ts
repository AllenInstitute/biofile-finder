import axios from "axios";
import JSZip from "jszip";
import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
} from "../../../core/services";

export default class FileDownloadServiceWeb extends FileDownloadService {
    isFileSystemAccessible = false;

    public async download(fileInfo: FileInfo): Promise<DownloadResult> {
        if (fileInfo.path.endsWith(".zarr")) {
            const downloadResult = await this.handleZarrFile(fileInfo);
            if (downloadResult) {
                return downloadResult;
            }
        }

        return this.downloadFile(fileInfo);
    }

    private async handleZarrFile(fileInfo: FileInfo): Promise<DownloadResult | null> {
        if (this.isS3Url(fileInfo.path)) {
            return await this.downloadS3Directory(fileInfo);
        }

        const localDownloadResult = this.isLocalPath(fileInfo.path, fileInfo);
        return localDownloadResult;
    }

    private isLocalPath(filePath: string, fileInfo: FileInfo): DownloadResult | null {
        const uriPattern = /^(https?|ftp):\/\/|^[a-zA-Z]:\\/;
        const isLocal = filePath.startsWith("file://") || !uriPattern.test(filePath);

        if (isLocal) {
            const directoryPath = fileInfo.path;

            const message = `The directory containing the Zarr file is located at: ${directoryPath}.
Due to security restrictions, the web browser cannot open this location directly. 
Please navigate to this directory manually, or upload files to a remote address such as S3.`;

            alert(message);
            console.log(`Local directory path: ${directoryPath}`);

            return {
                downloadRequestId: fileInfo.id,
                resolution: DownloadResolution.CANCELLED,
            };
        }

        return null;
    }

    private async downloadS3Directory(fileInfo: FileInfo): Promise<DownloadResult> {
        const { hostname, key } = this.parseS3Url(fileInfo.path);
        const keys = await this.listS3Objects(hostname, key);

        if (keys.length === 0) {
            throw new Error("No files found in the specified S3 directory.");
        }

        // Initialize JSZip for zipping files
        const zip = new JSZip();

        try {
            for (const fileKey of keys) {
                const fileUrl = `https://${hostname}/${encodeURIComponent(fileKey)}`;
                const response = await axios.get(fileUrl, { responseType: "blob" });
                const fileData = response.data;
                const fileName = fileKey.replace(`${key}/`, "");

                // Add the file to JSZip
                zip.file(fileName, fileData);
            }

            // Generate the ZIP file as a Blob and trigger the download
            const zipBlob = await zip.generateAsync({ type: "blob" });
            this.downloadZipBlob(zipBlob, `${fileInfo.name}.zip`);
        } catch (error) {
            console.error(`Error while creating ZIP: ${error}`);
            throw error;
        }

        return {
            downloadRequestId: fileInfo.id,
            resolution: DownloadResolution.SUCCESS,
        };
    }

    private downloadZipBlob(blob: Blob, fileName: string): void {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(downloadUrl);
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

    public getDefaultDownloadDirectory(): Promise<string> {
        throw new Error(
            "FileDownloadServiceWeb:getDefaultDownloadDirectory not implemented for web"
        );
    }

    public cancelActiveRequest(): void {
        /** noop: Browser will handle cancellation */
    }
}
