export enum DownloadResolution {
    CANCELLED = "CANCELLED",
    SUCCESS = "SUCCESS",
}

export interface DownloadResult {
    downloadRequestId: string;
    msg?: string;
    resolution: DownloadResolution;
}

/**
 * Interface that defines a platform-dependent service for implementing download functionality.
 */
export default interface FileDownloadService {
    /**
     * Download a CSV manifest from `url` of selected files described by `data` (POST data).
     */
    downloadCsvManifest(
        url: string,
        data: string,
        downloadRequestId: string
    ): Promise<DownloadResult>;

    /**
     * Download a file located at `filePath`. Optionally provide an "onProgress" callback that will be
     * called repeatedly over the course of the file download with the number of bytes downloaded so far.
     */
    downloadFile(
        filePath: string,
        fileSize: number,
        downloadRequestId: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult>;

    /**
     * Attempt to cancel an active download request, deleting the downloaded artifact if present.
     * Returns whether or not the file was present (to be deleted).
     */
    cancelActiveRequest(downloadRequestId: string): Promise<void>;
}
