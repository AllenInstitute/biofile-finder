/**
 * Interface that defines a platform-dependent service for implementing download functionality.
 */
export default interface FileDownloadService {
    /**
     * Download a CSV manifest from `url` of selected files described by `data` (POST data). `totalCount` represents
     * the total number of selected files. Optionally, call an `onEnd` callback when the download completes. If an
     * error is encountered, the promise returned by this method will be rejected.
     */
    downloadCsvManifest(
        url: string,
        data: string,
        totalCount: number,
        onEnd?: () => void
    ): Promise<void>;
}
