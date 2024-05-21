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

/**
 * Interface that defines a platform-dependent service for implementing download functionality.
 */
export default interface FileDownloadService {
    isFileSystemAccessible: boolean;

    /**
     * Retrieves the file system's default download location.
     */
    getDefaultDownloadDirectory(): Promise<string>;

    /**
     * Download a file described by `fileInfo`. Optionally provide an "onProgress" callback that will be
     * called repeatedly over the course of the file download with the number of bytes downloaded so far.
     */
    download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult>;

    /**
     * Retrieve a Blob from a server over HTTP.
     */
    prepareHttpResourceForDownload(url: string, postBody: string): Promise<string>;

    /**
     * Attempt to cancel an active download request, deleting the downloaded artifact if present.
     */
    cancelActiveRequest(downloadRequestId: string): void;
}

/**
 * Sentinel value used to send and check for cancellation of a file download prompt.
 */
export const FileDownloadCancellationToken =
    "FMS_EXPLORER_EXECUTABLE_FILE_DOWNLOAD_CANCELLATION_TOKEN";
