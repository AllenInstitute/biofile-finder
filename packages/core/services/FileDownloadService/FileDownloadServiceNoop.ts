import FileDownloadService, { DownloadResolution, DownloadResult, FileInfo } from ".";

export default class FileDownloadServiceNoop implements FileDownloadService {
    isFileSystemAccessible = false;

    download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (progress: number) => void
    ): Promise<DownloadResult> {
        return Promise.resolve({
            downloadRequestId,
            onProgress,
            msg: `Download of ${fileInfo.path} triggered on FileDownloadServiceNoop; returning without triggering a download.`,
            resolution: DownloadResolution.SUCCESS,
        });
    }

    prepareHttpResourceForDownload(): Promise<object> {
        return Promise.reject(
            "Triggered prepareHttpResourceForDownload on FileDownloadServiceNoop"
        );
    }

    getDefaultDownloadDirectory(): Promise<string> {
        return Promise.resolve("Triggered getDefaultDownloadDirectory on FileDownloadServiceNoop");
    }

    cancelActiveRequest() {
        /** noop */
    }
}
