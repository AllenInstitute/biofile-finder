import StreamSaver from "streamsaver";
import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
    HttpServiceBase,
} from "../../../core/services";
import axios from "axios";

export default class FileDownloadServiceWeb extends HttpServiceBase implements FileDownloadService {
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
        return localDownloadResult; // This will be either a DownloadResult or null
    }

    private isS3Url(url: string): boolean {
        try {
            const { protocol, hostname } = new URL(url);
            return protocol === "https:" && hostname.endsWith(".amazonaws.com");
        } catch (error) {
            return false;
        }
    }

    private isLocalPath(filePath: string, fileInfo: FileInfo): DownloadResult | null {
        const uriPattern = /^(https?|ftp):\/\/|^[a-zA-Z]:\\/;
        const isLocal = filePath.startsWith("file://") || !uriPattern.test(filePath);

        if (isLocal) {
            const directoryPath = fileInfo.path;

            const message = `The directory containing the Zarr file is located at: ${directoryPath}.
Due to security restrictions, the web browser cannot open this location directly. 
Please navigate to this directory manually, or use the desktop version of the application.`;

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
        const { bucket, key, region } = this.parseS3Url(fileInfo.path);
        const keys = await this.listS3Objects(bucket, key, region);

        if (keys.length === 0) {
            throw new Error("No files found in the specified S3 directory.");
        }

        const fileStream = StreamSaver.createWriteStream(`${fileInfo.name}.zip`);
        const writer = fileStream.getWriter();

        try {
            for (const fileKey of keys) {
                const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(
                    fileKey
                )}`;
                const response = await axios.get(fileUrl, { responseType: "blob" });

                const blob = response.data;
                const stream = blob.stream();
                await stream.pipeTo(
                    new WritableStream({
                        write(chunk) {
                            writer.write(chunk);
                        },
                    })
                );
            }
            writer.close();

            return {
                downloadRequestId: fileInfo.id,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err) {
            console.error(`Failed to download directory: ${err}`);
            writer.abort();
            throw err;
        }
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

    public cancelActiveRequest(): void {
        /** noop: Browser will handle cancellation */
    }
}
