import axios from "axios";
import StreamSaver from "streamsaver";

import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
    FileStorageServiceBase,
} from "../../../core/services";

export default class FileDownloadServiceWeb
    extends FileStorageServiceBase
    implements FileDownloadService {
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

        const fileStream = StreamSaver.createWriteStream(`${fileInfo.name}.zip`);
        const writer = fileStream.getWriter();

        try {
            for (const fileKey of keys) {
                const fileUrl = `${hostname}/${encodeURIComponent(fileKey)}`;
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
