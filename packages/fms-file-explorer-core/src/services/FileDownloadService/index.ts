/**
 * Interface that defines a platform-dependent service for implementing download functionality.
 */
export default interface FileDownloadService {
    /**
     * Download a CSV manifest from `url` of selected files described by `data` (POST data). `totalCount` represents
     * the total number of selected files.
     */
    downloadCsvManifest(url: string, data: string, id: string): Promise<string>;

    /**
     * Attempt to cancel an active download request, deleting the downloaded artifact if present.
     * Returns whether or not the file was present (to be deleted).
     */
    cancelActiveRequest(id: string): Promise<void>;
}

/**
 * Sentinel value used to send and check for cancellation of a download request.
 */
export const CancellationToken = "FMS_EXPLORER_DOWNLOAD_SERVICE_CANCELLATION_TOKEN";
