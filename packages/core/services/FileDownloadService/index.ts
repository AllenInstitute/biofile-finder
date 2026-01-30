import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import S3StorageService from "../S3StorageService";
import S3StorageServiceNoop from "../S3StorageService/S3StorageServiceNoop";

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

// Maps active request ids (uuids) to request download info
interface ActiveRequestMap {
    [id: string]: {
        filePath?: string;
        cancel: () => void;
        onProgress?: (bytes: number) => void;
    };
}

/**
 * Abstract class for interfacing with file downloads
 */
export default abstract class FileDownloadService extends HttpServiceBase {
    abstract isFileSystemAccessible: boolean;
    protected readonly activeRequestMap: ActiveRequestMap = {};
    protected readonly cancellationRequests: Set<string> = new Set();
    protected readonly s3StorageService: S3StorageService;

    constructor(
        s3StorageService: S3StorageService = new S3StorageServiceNoop(),
        config: ConnectionConfig = {}
    ) {
        super({ ...config, includeCustomHeaders: false });
        this.s3StorageService = s3StorageService;
    }

    /**
     * Download a file described by `fileInfo`. Optionally provide an "onProgress" callback that will be
     * called repeatedly over the course of the file download with the number of bytes downloaded so far.
     */
    abstract download(
        fileInfo: FileInfo,
        downloadRequestId: string,
        onProgress?: (bytesDownloaded: number) => void
    ): Promise<DownloadResult>;

    /**
     * Retrieves the file system's default download location.
     */
    abstract getDefaultDownloadDirectory(): Promise<string>;

    /**
     * Retrieve a Blob from a server over HTTP.
     */
    public async prepareHttpResourceForDownload(url: string, postBody: string): Promise<Blob> {
        const response = await this.rawPost<string>(url, postBody);
        return new Blob([response], { type: "application/json" });
    }

    /**
     * Attempt to cancel an active download request, deleting the downloaded artifact if possible
     */
    public cancelActiveRequest(downloadRequestId: string): void {
        this.cancellationRequests.add(downloadRequestId);

        if (this.activeRequestMap[downloadRequestId]) {
            const { cancel } = this.activeRequestMap[downloadRequestId];
            cancel();
            delete this.activeRequestMap[downloadRequestId];
        }
    }
}

/**
 * Sentinel value used to send and check for cancellation of a file download prompt.
 */
export const FileDownloadCancellationToken =
    "FMS_EXPLORER_EXECUTABLE_FILE_DOWNLOAD_CANCELLATION_TOKEN";

/**
 * Maximum size of multifile cloud files that can be downloaded from a browser ~2GB
 */
export const MAX_DOWNLOAD_SIZE_WEB = 2 * 1024 * 1024 * 1024;
