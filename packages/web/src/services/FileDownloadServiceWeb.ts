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
            return await this.handleZarrFile(fileInfo);
        } else {
            return await this.downloadFile(fileInfo);
        }
    }

    private async handleZarrFile(fileInfo: FileInfo): Promise<DownloadResult> {
        if (this.isS3Url(fileInfo.path)) {
            return await this.downloadS3Directory(fileInfo);
        }

        if (this.isLocalPath(fileInfo.path)) {
            return this.handleLocalZarrFile(fileInfo);
        }

        const message = `The file path "${fileInfo.path}" is not supported for Zarr downloads in the web environment. 
Only S3 URLs are supported. Please upload your files to an S3 bucket for web-based downloads.`;
        alert(message);
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
            resolution: DownloadResolution.CANCELLED,
        };
    }

    private async downloadS3Directory(fileInfo: FileInfo): Promise<DownloadResult> {
        const { hostname, key } = this.parseS3Url(fileInfo.path);
        const keys = await this.listS3Objects(hostname, key);

        if (keys.length === 0) {
            throw new Error("No files found in the specified S3 directory.");
        }

        const zip = new JSZip();

        for (const fileKey of keys) {
            const fileUrl = `https://${hostname}/${encodeURIComponent(fileKey)}`;
            const response = await axios.get(fileUrl, { responseType: "blob" });
            const fileData = response.data;
            const fileName = fileKey.replace(`${key}/`, "");

            zip.file(fileName, fileData);
        }

        // Generate the ZIP file as a Blob and trigger the download
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${fileInfo.name}.zip`;
        a.click();
        URL.revokeObjectURL(downloadUrl);

        return {
            downloadRequestId: fileInfo.id,
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

    public getDefaultDownloadDirectory(): Promise<string> {
        throw new Error(
            "FileDownloadServiceWeb:getDefaultDownloadDirectory not implemented for web"
        );
    }

    public cancelActiveRequest(): void {
        /** noop: Browser will handle cancellation */
    }
}
