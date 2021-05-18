import { uniqueId } from "lodash";

import FileDownloadService, { DownloadResolution, FileInfo } from ".";

export default class FileDownloadServiceNoop implements FileDownloadService {
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

    cancelActiveRequest() {
        /** noop */
    }
}
