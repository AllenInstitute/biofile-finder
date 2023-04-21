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
    size: number;
}

/**
 * Interface that defines a platform-dependent service for implementing download functionality.
 */
export default interface FileDownloadService {
    /**
     * Get default download directory for the OS
     */
    getDefaultDownloadDirectory(): Promise<string>;

    /**
     * Download a CSV manifest from `url` of selected files described by `data` (POST data).
     */
    downloadCsvManifest(
        url: string,
        data: string,
        downloadRequestId: string
    ): Promise<DownloadResult>;

    /**
     * Download a file described by `fileInfo`. Optionally provide an "onProgress" callback that will be
     * called repeatedly over the course of the file download with the number of bytes downloaded so far.
     */
    downloadFile(
        fileInfo: FileInfo,
        downloadRequestId: string,
        destination: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult>;

    /**
     * Prompts the user for a download directory.
     * Will first notify the user of this request.
     */
    promptForDownloadDirectory(): Promise<string>;

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
