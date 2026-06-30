import { parseS3Url, isS3Url } from "amazon-s3-url";
import axios, { AxiosResponse } from "axios";

import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

interface HttpInfo {
    type: "webpage" | "image" | "multi-object" | "unknown";
    size?: number;
}

/**
 * Return true if the URL seems to point to a multi object file like Zarr
 */
export const isMultiObjectFile = (url: string) =>
    [".zarr", ".zarr/", ".sldy", ".sldy/"].some((ext) => url.endsWith(ext));

interface ParsedUrl {
    hostname: string;
    bucket: string;
    key: string;
}

/**
 * Class for interfacing with objects stored on S3
 */
export default class S3StorageService extends HttpServiceBase {
    /**
     * Given a parsed URL return a simple HTTP URL pointing to a file
     */
    private static formatAsHttpResource(parsedUrl: ParsedUrl) {
        const bucketSimplified = parsedUrl.bucket.length > 0 ? `${parsedUrl.bucket}/` : "";
        return `https://${parsedUrl.hostname}/${bucketSimplified}${encodeURIComponent(
            parsedUrl.key
        )}`;
    }

    /**
     * Return true if s3 file.
     */
    private static isSimpleS3Url(url: string): boolean {
        try {
            return isS3Url(url);
        } catch (error) {
            return false;
        }
    }

    /**
     * Break down S3 URL to host, bucket, and path (key).
     */
    private static parseSimpleUrl(url: string): ParsedUrl {
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

    public async formatAsHttpResource(url: string): Promise<string | undefined> {
        const parsedUrl = await this.parseUrl(url);
        if (!parsedUrl) return;
        return S3StorageService.formatAsHttpResource(parsedUrl);
    }

    /**
     * Return the interpretted type and size of the cloud object.
     *
     * Returns type = "multi-object" if the URL points to a multi-object file like Zarr
     * Returns type = "webpage" if the URL points to a webpage (e.g. HTML)
     * Returns type = "image" if the URL points to an image (e.g. PNG, JPEG)
     * Returns type = "unknown" if the URL points to an unknown type of file
     * Returns size = undefined if unable to determine size
     */
    public async getCloudObjectInfo(url: string, forceTypeDetection = false): Promise<HttpInfo> {
        if (isMultiObjectFile(url)) {
            const cloudDirInfo = await this.getCloudDirectoryInfo(url);
            const { size } = cloudDirInfo || {};
            return { type: "multi-object", size };
        }

        return this.getHttpObjectSize(url, forceTypeDetection);
    }

    /**
     * Get the URL and name for each object within an S3 directory
     *
     * This can return several millions of files for something like a Zarr,
     * so is a generator that yields one at a time rather than returning an array.
     */
    public async *getObjectsInDirectory(
        parsedUrl: ParsedUrl
    ): AsyncGenerator<{ url: string; name: string }> {
        let continuationToken: string | undefined;
        const url = `https://${parsedUrl.hostname}/${
            parsedUrl.bucket
        }?list-type=2&prefix=${encodeURIComponent(parsedUrl.key)}`;

        do {
            const listUrl = continuationToken
                ? `${url}&continuation-token=${encodeURIComponent(continuationToken)}`
                : url;
            const response = await this.httpClient.get(listUrl);

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.data, "text/xml");
            const nextToken = xmlDoc.getElementsByTagName("NextContinuationToken")[0];
            continuationToken = nextToken?.textContent || undefined;

            const contents = xmlDoc.getElementsByTagName("Key");
            for (let i = 0; i < contents.length; i++) {
                const key = contents[i].textContent || "";
                if (key.endsWith("/")) {
                    continue;
                }
                yield {
                    name: key,
                    url: S3StorageService.formatAsHttpResource({
                        ...parsedUrl,
                        key,
                    }),
                };
            }
        } while (continuationToken);
    }

    /**
     * Calculate the total size of all files in an S3 directory (or zarr file).
     * Returns undefined if unable to calculate size.
     */
    public async getCloudDirectoryInfo(
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
    private async getHttpObjectSize(url: string, forceTypeDetection: boolean): Promise<HttpInfo> {
        let response: AxiosResponse;
        try {
            response = await axios.head(url);
        } catch (err) {
            console.warn(`Failed to get HEAD url. Will try via GET request.`);
            if (!forceTypeDetection) {
                console.error(
                    `Failed to get HEAD url. Unable to get content length or type: ${err}`
                );
                throw err;
            }

            // Some servers (e.g. S3) do not support HEAD requests, so try a GET request instead
            // Note: this can be slow for large files so only do this if forceTypeDetection is true
            //       and the HEAD request already failed
            try {
                response = await axios.get(url, {
                    responseType: "arraybuffer", // prevents parsing large HTML/images unnecessarily
                    maxRedirects: 5,
                    timeout: 3_000,
                    validateStatus: () => true, // don’t throw on non-2xx
                });
            } catch (err) {
                console.error(
                    `Failed to get HEAD or GET url. Unable to get content length or type: ${err}`
                );
                throw err;
            }
        }

        const size = parseInt(response.headers["content-length"] || "0", 10);
        const contentType = response.headers["content-type"]?.toLowerCase() ?? "";
        if (contentType.startsWith("image/")) return { type: "image", size };
        if (contentType.includes("text/html")) return { type: "webpage", size };
        return { type: "unknown", size };
    }

    /**
     * Parse URL into hostname, bucket, key from a url
     */
    private parseUrl(url: string): Promise<ParsedUrl | undefined> {
        return S3StorageService.isSimpleS3Url(url)
            ? Promise.resolve(S3StorageService.parseSimpleUrl(url))
            : // TODO: what about virtualized objects not directories???
              this.parseVirtualizedDirectory(url);
    }

    /**
     * Parse a potentially virtualized S3 URL that would not be identifiable by parseS3Url
     * Returns undefined if unable to parse
     */
    private async parseVirtualizedDirectory(url: string): Promise<ParsedUrl | undefined> {
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
