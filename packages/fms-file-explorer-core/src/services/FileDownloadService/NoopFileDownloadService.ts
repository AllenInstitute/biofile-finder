import FileDownloadService from ".";

export default class NoopFileDownloadService implements FileDownloadService {
    public downloadCsvManifest() {
        // NOOP
        console.log(
            "Download of CSV manifest triggered on NoopFileDownloadService; returning without triggering a download."
        );
        return Promise.resolve();
    }
}
