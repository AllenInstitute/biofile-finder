import { uniqueId } from "lodash";

import FileDownloadService, { DownloadResolution, FileInfo } from ".";

export default class FileDownloadServiceNoop implements FileDownloadService {
    getDefaultDownloadDirectory() {
        return Promise.resolve("Default directory request from FileDownloadServiceNoop");
    }

    downloadCsvManifest() {
        return Promise.resolve({
            downloadRequestId: uniqueId(),
            msg:
                "Download of CSV manifest triggered on FileDownloadServiceNoop; returning without triggering a download.",
            resolution: DownloadResolution.SUCCESS,
        });
    }

    downloadFile(fileInfo: FileInfo) {
        return Promise.resolve({
            downloadRequestId: uniqueId(),
            msg: `Download of ${fileInfo.path} triggered on FileDownloadServiceNoop; returning without triggering a download.`,
            resolution: DownloadResolution.SUCCESS,
        });
    }

    promptForDownloadDirectory() {
        return Promise.resolve(
            "Prompt for download directory triggered on FileDownloadServiceNoop"
        );
    }

    cancelActiveRequest() {
        /** noop */
    }
}
