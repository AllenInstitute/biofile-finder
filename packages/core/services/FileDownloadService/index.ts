import { parseS3Url, isS3Url } from "amazon-s3-url";
import axios from "axios";
import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

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

interface ParsedUrl {
    hostname: string;
    bucket: string;
    key: string;
}

// Maps active request ids (uuids) to request download info
interface ActiveRequestMap {
    [id: string]: {
        filePath?: string;
        cancel: () => void;
        onProgress?: (bytes: number) => void;
    };
}

/**
 * Abstract class for interfacing with file downloads
 */
export default abstract class FileDownloadService extends HttpServiceBase {
    abstract isFileSystemAccessible: boolean;
    protected readonly activeRequestMap: ActiveRequestMap = {};
    protected readonly cancellationRequests: Set<string> = new Set();

    /**
     * Return true if s3 file.
     */
    private static isS3Url(url: string): boolean {
        try {
            return isS3Url(url);
        } catch (error) {
            return false;
        }
    }

    /**
     * Return true if the URL seems to point to a Zarr
     */
    public static isZarr(url?: string) {
        return !!url && (url.endsWith(".zarr") || url.endsWith(".zarr/"));
    }

    /**
     * Given a parsed URL return a simple HTTP URL pointing to a file
     */
    protected static formatUrlAsFileResource(parsedUrl: ParsedUrl) {
        const bucketSimplified = parsedUrl.bucket.length > 0 ? `${parsedUrl.bucket}/` : "";
        return `https://${parsedUrl.hostname}/${bucketSimplified}${encodeURIComponent(
            parsedUrl.key
        )}`;
    }

    /**
     * Break down S3 URL to host, bucket, and path (key).
     */
    private static parseS3Url(url: string): ParsedUrl {
        const { protocol, hostname } = new URL(url);
        const { region, bucket, key } = parseS3Url(url);
        let parsedHost = hostname;
        // CORS does not work with s3: protocol urls, so convert to a standard http host
        if (protocol === "s3:") {
            parsedHost = `s3.${region ? `${region}.` : ""}amazonaws.com`;
        } else if (bucket && hostname.startsWith(bucket)) {
            parsedHost = hostname.slice(bucket.length + 1);
        }
        return { hostname: parsedHost, bucket, key };
    }

    constructor(config: ConnectionConfig = {}) {
        super({ ...config, includeCustomHeaders: false });
    }

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
     * Parse URL into hostname, bucket, key from a url
     */
    public parseUrl(url: string) {
        return FileDownloadService.isS3Url(url)
            ? Promise.resolve(FileDownloadService.parseS3Url(url))
            : this.parseVirtualizedUrl(url);
    }

    /**
     * Get file size for a file on the cloud
     * Returns undefined if unable to determine size
     */
    public async getCloudObjectSize(url: string): Promise<number | undefined> {
        if (FileDownloadService.isZarr(url)) {
            const cloudDirInfo = await this.getCloudDirectoryInfo(url);
            if (!cloudDirInfo) return;
            return cloudDirInfo.size;
        } else if (url.includes("amazonaws.com")) {
            // Handle individual S3 files if they are simple
            return this.getHttpObjectSize(url);
        }
    }

    /**
     * Attempt to cancel an active download request, deleting the downloaded artifact if possible
     */
    public cancelActiveRequest(downloadRequestId: string): void {
        this.cancellationRequests.add(downloadRequestId);

        if (this.activeRequestMap[downloadRequestId]) {
            const { cancel } = this.activeRequestMap[downloadRequestId];
            cancel();
            delete this.activeRequestMap[downloadRequestId];
        }
    }

    /**
     * List components of S3 directory.
     */
    protected async listS3Objects(parsedUrl: ParsedUrl): Promise<string[]> {
        const url = `https://${parsedUrl.hostname}/${
            parsedUrl.bucket
        }?list-type=2&prefix=${encodeURIComponent(parsedUrl.key)}`;
        const response = await this.httpClient.get(url);
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
     * Returns undefined if unable to calculate size.
     */
    protected async getCloudDirectoryInfo(
        directoryUrl: string
    ): Promise<{ size: number; parsedUrl: ParsedUrl } | undefined> {
        // Will be unable to calculate size so will be unable to download
        const parsedUrl = await this.parseUrl(directoryUrl);
        if (!parsedUrl) {
            return;
        }

        let totalSize = 0;
        let continuationToken: string | undefined;
        const url = `https://${parsedUrl.hostname}/${
            parsedUrl.bucket
        }?list-type=2&prefix=${encodeURIComponent(parsedUrl.key)}`;

        do {
            const listUrl = continuationToken
                ? `${url}&continuation-token=${encodeURIComponent(continuationToken)}`
                : url;

            try {
                const response = await this.httpClient.get(listUrl);
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

        return { size: totalSize, parsedUrl };
    }

    /**
     * Attempt to retrieve file size from an http object using a HEAD request.
     *
     * Returns bytes (octet)
     */
    private async getHttpObjectSize(url: string): Promise<number> {
        try {
            const response = await axios.head(url);
            return parseInt(response.headers["content-length"] || "0", 10);
        } catch (err) {
            console.error(`Failed to get file size (content-length): ${err}`);
            throw err;
        }
    }

    /**
     * Parse a potentially virtualized S3 URL that would not be identifiable by parseS3Url
     * Returns undefined if unable to parse
     */
    private async parseVirtualizedUrl(url: string): Promise<ParsedUrl | undefined> {
        let urlObj;
        try {
            urlObj = new URL(url);
        } catch (err) {
            return undefined;
        }
        const hostname = urlObj.hostname;
        const key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;

        // Check if actually able to use directory arguments before returning
        const directoryUrl = `https://${hostname}?list-type=2&prefix=${encodeURIComponent(key)}`;
        try {
            await this.httpClient.get(directoryUrl);
            return { hostname, key, bucket: "" };
        } catch (error) {
            return undefined;
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
