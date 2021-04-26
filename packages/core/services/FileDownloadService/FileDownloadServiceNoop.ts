import FileDownloadService from ".";

export default class FileDownloadServiceNoop implements FileDownloadService {
    public downloadCsvManifest() {
        return Promise.resolve(
            "Download of CSV manifest triggered on FileDownloadServiceNoop; returning without triggering a download."
        );
    }

    public downloadFile(filePath: string) {
        return Promise.resolve(
            `Download of ${filePath} triggered on FileDownloadServiceNoop; returning without triggering a download.`
        );
    }

    public cancelActiveRequest(): Promise<void> {
        return Promise.resolve();
    }
}
