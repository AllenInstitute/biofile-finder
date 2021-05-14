export default class DownloadFailure extends Error {
    public downloadIdentifier: string;

    constructor(message: string, downloadIdentifier: string) {
        super(message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DownloadFailure);
        }

        this.name = "DownloadFailure";
        this.downloadIdentifier = downloadIdentifier;
    }
}
