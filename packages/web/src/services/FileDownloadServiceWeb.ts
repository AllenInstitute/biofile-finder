import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
    HttpServiceBase,
} from "../../../core/services";
import axios from "axios";
import JSZip from "jszip";

export default class FileDownloadServiceWeb extends HttpServiceBase implements FileDownloadService {
    isFileSystemAccessible = false;

    public async download(fileInfo: FileInfo): Promise<DownloadResult> {
        if (fileInfo.path.endsWith(".zarr")) {
            return this.downloadS3Directory(fileInfo);
        }

        const data = fileInfo.data || fileInfo.path;
        let downloadUrl: string;
        if (data instanceof Uint8Array) {
            downloadUrl = URL.createObjectURL(new Blob([data]));
        } else if (data instanceof Blob) {
            downloadUrl = URL.createObjectURL(data);
        } else {
            downloadUrl = data;
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

    private async downloadS3Directory(fileInfo: FileInfo): Promise<DownloadResult> {
        const { bucket, key, region } = this.parseS3Url(fileInfo.path);
        const keys = await this.listS3Objects(bucket, key, region);

        if (keys.length === 0) {
            throw new Error("No files found in the specified S3 directory.");
        }

        const zip = new JSZip();

        for (const fileKey of keys) {
            const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(
                fileKey
            )}`;
            const response = await axios.get(fileUrl, { responseType: "blob" });
            const relativePath = fileKey.slice(key.length + 1); // Adjust path to remove prefix
            zip.file(relativePath, response.data);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const downloadUrl = URL.createObjectURL(blob);

        try {
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `${fileInfo.name}.zip`;
            a.target = "_blank";
            a.click();
            a.remove();
            return {
                downloadRequestId: fileInfo.id,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err) {
            console.error(`Failed to download directory: ${err}`);
            throw err;
        } finally {
            URL.revokeObjectURL(downloadUrl);
        }
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
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");

        const keys: string[] = [];
        const contents = xmlDoc.getElementsByTagName("Key");

        for (let i = 0; i < contents.length; i++) {
            keys.push(contents[i].textContent || "");
        }

        return keys;
    }

    public async prepareHttpResourceForDownload(url: string, postBody: string): Promise<Blob> {
        const response = await this.rawPost<string>(url, postBody);
        return new Blob([response], { type: "application/json" });
    }

    public getDefaultDownloadDirectory(): Promise<string> {
        throw new Error(
            "FileDownloadServiceWeb:getDefaultDownloadDirectory not implemented for web"
        );
    }

    public cancelActiveRequest() {
        /** noop: Browser will handle cancellation */
    }
}
