import FileDownloadService from ".";

export default class FileDownloadServiceNoop implements FileDownloadService {
    public downloadCsvManifest() {
        // NOOP
        console.log(
            "Download of CSV manifest triggered on FileDownloadServiceNoop; returning without triggering a download."
        );
        return Promise.resolve();
    }
}
