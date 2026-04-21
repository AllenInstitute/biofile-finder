import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import S3StorageService from "../S3StorageService";
import S3StorageServiceNoop from "../S3StorageService/S3StorageServiceNoop";

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

export default abstract class FileDownloadService extends HttpServiceBase {
    abstract isFileSystemAccessible: boolean;
    protected readonly s3StorageService: S3StorageService;

    constructor(
        s3StorageService: S3StorageService = new S3StorageServiceNoop(),
        config: ConnectionConfig = {}
    ) {
        super({ ...config, includeCustomHeaders: false });
        this.s3StorageService = s3StorageService;
    }

    abstract download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult>;

    abstract getDefaultDownloadDirectory(): Promise<string>;

    public async prepareHttpResourceForDownload(url: string, postBody: string): Promise<Blob> {
        const response = await this.rawPost<string>(url, postBody);
        return new Blob([response], { type: "application/json" });
    }

    public cancelActiveRequest(_downloadRequestId: string): void {
        /* noop */
    }
}

export const FileDownloadCancellationToken = "FILE_DOWNLOAD_CANCELLATION_TOKEN";
