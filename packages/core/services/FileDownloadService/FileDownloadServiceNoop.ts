import { uniqueId } from "lodash";

import FileDownloadService, { DownloadResolution } from ".";

export default class FileDownloadServiceNoop implements FileDownloadService {
    downloadCsvManifest() {
        return Promise.resolve({
            downloadRequestId: uniqueId(),
            msg:
                "Download of CSV manifest triggered on FileDownloadServiceNoop; returning without triggering a download.",
            resolution: DownloadResolution.SUCCESS,
        });
    }

    downloadFile(filePath: string) {
        return Promise.resolve({
            downloadRequestId: uniqueId(),
            msg: `Download of ${filePath} triggered on FileDownloadServiceNoop; returning without triggering a download.`,
            resolution: DownloadResolution.SUCCESS,
        });
    }

    cancelActiveRequest(): Promise<void> {
        return Promise.resolve();
    }
}
