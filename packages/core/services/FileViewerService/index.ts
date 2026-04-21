/**
 * Stub. No file-viewer integration in this simplified build.
 */
export default interface FileViewerService {
    open(executablePath: string, filePaths: string[]): Promise<void>;
}

export const FileViewerCancellationToken = "FILE_VIEWER_CANCELLATION_TOKEN";
