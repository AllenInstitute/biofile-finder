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

    downloadFile(
        fileInfo: FileInfo,
        _: string,
        destination: string,
        onProgress?: (bytesDownloaded: number) => void
    ) {
        return Promise.resolve({
            downloadRequestId: uniqueId(),
            destination,
            onProgress,
            msg: `Download of ${fileInfo.path} triggered on FileDownloadServiceNoop; returning without triggering a download.`,
            resolution: DownloadResolution.SUCCESS,
        });
    }

    promptForDownloadDirectory() {
        return Promise.resolve(
            "Prompt for download directory triggered on FileDownloadServiceNoop"
        );
    }

    promptForSaveLocation(): Promise<string> {
        return Promise.resolve("Prompt for save location triggered on FileDownloadServiceNoop");
    }

    cancelActiveRequest() {
        /** noop */
    }
}
