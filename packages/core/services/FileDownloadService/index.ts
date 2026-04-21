/**
 * Stub FileDownloadService kept only to satisfy type references in services
 * that still accept a download service parameter. No actual download UI exists.
 */

export enum DownloadResolution {
    CANCELLED = "CANCELLED",
    SUCCESS = "SUCCESS",
}

export interface DownloadResult {
    downloadRequestId: string;
    msg?: string;
    resolution: DownloadResolution;
}

export interface FileInfo {
    id: string;
    name: string;
    path: string;
    size?: number;
    data?: Uint8Array | Blob | string;
}

export default abstract class FileDownloadService {
    abstract isFileSystemAccessible: boolean;

    abstract download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult>;

    abstract getDefaultDownloadDirectory(): Promise<string>;

    public async prepareHttpResourceForDownload(_url: string, _postBody: string): Promise<Blob> {
        return new Blob([], { type: "application/json" });
    }

    public getEnvironmentFromUrl(_url: string): string {
        return "production";
    }

    public cancelActiveRequest(_downloadRequestId: string): void {
        /* noop */
    }
}

export const FileDownloadCancellationToken = "FILE_DOWNLOAD_CANCELLATION_TOKEN";
