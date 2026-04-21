import FileDownloadService, { DownloadResolution, DownloadResult, FileInfo } from ".";

export default class FileDownloadServiceNoop extends FileDownloadService {
    isFileSystemAccessible = false;

    download(
        _fileInfo: FileInfo,
        downloadRequestId: string
    ): Promise<DownloadResult> {
        return Promise.resolve({
            downloadRequestId,
            resolution: DownloadResolution.SUCCESS,
        });
    }

    prepareHttpResourceForDownload(): Promise<Blob> {
        return Promise.resolve(new Blob());
    }

    getDefaultDownloadDirectory(): Promise<string> {
        return Promise.resolve("");
    }

    cancelActiveRequest() {
        /* noop */
    }
}
