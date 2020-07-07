import FileDownloadService from ".";

export default class NoopFileDownloadService implements FileDownloadService {
    public async downloadCsvManifest() {
        /** NOOP */
    }
}
