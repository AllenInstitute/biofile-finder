import axios from "axios";
import HttpServiceBase from "../HttpServiceBase";

export enum DownloadResolution {
    CANCELLED = "CANCELLED",
    SUCCESS = "SUCCESS",
}

export interface DownloadResult {
    downloadRequestId: string;
    msg?: string;
    resolution: DownloadResolution;
}

export interface FileInfo {
    id: string;
    name: string;
    path: string;
    size?: number;
    data?: Uint8Array | Blob | string;
}

export default abstract class FileDownloadService extends HttpServiceBase {
    abstract isFileSystemAccessible: boolean;

    /**
     * Attempt to cancel an active download request, deleting the downloaded artifact if present.
     */
    abstract cancelActiveRequest(downloadRequestId: string): void;

    /**
     * Download a file described by `fileInfo`. Optionally provide an "onProgress" callback that will be
     * called repeatedly over the course of the file download with the number of bytes downloaded so far.
     */
    abstract download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult>;

    /**
     * Retrieves the file system's default download location.
     */
    abstract getDefaultDownloadDirectory(): Promise<string>;

    /**
     * Retrieve a Blob from a server over HTTP.
     */
    public async prepareHttpResourceForDownload(url: string, postBody: string): Promise<Blob> {
        const response = await this.rawPost<string>(url, postBody);
        return new Blob([response], { type: "application/json" });
    }

    /**
     * Return true if s3 file.
     */
    public isS3Url(url: string): boolean {
        try {
            const { protocol, hostname } = new URL(url);
            return protocol === "https:" && hostname.endsWith(".amazonaws.com");
        } catch (error) {
            return false;
        }
    }

    /**
     * Break down S3 URL to Host and Path.
     */
    public parseS3Url(url: string): { hostname: string; key: string } {
        const { hostname, pathname } = new URL(url);
        const key = pathname.slice(1);
        return { hostname, key };
    }

    /**
     * List components of S3 directory.
     */
    public async listS3Objects(hostname: string, prefix: string): Promise<string[]> {
        const url = `https://${hostname}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
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

    /**
     * Calculate the total size of all files in an S3 directory (or zarr file).
     */
    public async calculateS3DirectorySize(hostname: string, prefix: string): Promise<number> {
        let totalSize = 0;
        let continuationToken: string | undefined = undefined;

        const url = `https://${hostname}?list-type=2&prefix=${encodeURIComponent(prefix)}`;

        do {
            const listUrl = continuationToken
                ? `${url}&continuation-token=${encodeURIComponent(continuationToken)}`
                : url;

            try {
                const response = await axios.get(listUrl);
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response.data, "text/xml");
                const nextToken = xmlDoc.getElementsByTagName("NextContinuationToken")[0];
                continuationToken = nextToken ? nextToken.textContent || undefined : undefined;

                const contents = xmlDoc.getElementsByTagName("Contents");
                for (let i = 0; i < contents.length; i++) {
                    const key = contents[i].getElementsByTagName("Key")[0]?.textContent || "";
                    const size = contents[i].getElementsByTagName("Size")[0]?.textContent || "0";

                    // Skip directory placeholders (keys ending with '/')
                    if (!key.endsWith("/")) {
                        totalSize += parseInt(size, 10);
                    }
                }
            } catch (err) {
                console.error(`Failed to list objects in S3 directory: ${err}`);
                throw err;
            }
        } while (continuationToken);

        return totalSize;
    }

    /**
     * Retrieve file metadata (specifically, file size) from an S3 object using a HEAD request.
     */
    public async headS3Object(url: string): Promise<{ size: number }> {
        try {
            const response = await axios.head(url);
            const fileSize = parseInt(response.headers["content-length"] || "0", 10);
            return { size: fileSize };
        } catch (err) {
            console.error(`Failed to get file metadata: ${err}`);
            throw err;
        }
    }
}

/**
 * Sentinel value used to send and check for cancellation of a file download prompt.
 */
export const FileDownloadCancellationToken =
    "FMS_EXPLORER_EXECUTABLE_FILE_DOWNLOAD_CANCELLATION_TOKEN";

/**
 * Maximum size of multifile cloud files that can be downloaded from a browser ~2GB
 */
export const MAX_DOWNLOAD_SIZE_WEB = 2 * 1024 * 1024 * 1024;
