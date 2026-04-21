import FileDownloadServiceNoop from "../../../core/services/FileDownloadService/FileDownloadServiceNoop";

// Stub. No real download feature in this simplified build.
export default class FileDownloadServiceWeb extends FileDownloadServiceNoop {
    constructor(..._args: unknown[]) {
        super();
    }
}
