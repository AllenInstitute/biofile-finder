import FileDetail from "../../entity/FileDetail";

/**
 * Interface that defines a platform-dependent service for showing files using other applications.
 */
export default interface FileViewerService {
    /**
     * Opens the given files in the executable.
     *
     * @param executablePath Path to executable to run commands against.
     * @param filePaths The paths to the files to open
     */
    open(executablePath: string, filePaths: string[]): Promise<void>;

    /**
     * Opens the user's native file browser at a given path.
     *
     * @param fileDetails
     */
    openNativeFileBrowser(fileDetails: FileDetail): void;
}

/**
 * Sentinel value used to send and check for cancellation of a persistent config action.
 */
export const FileViewerCancellationToken = "FMS_EXPLORER_FILE_VIEWER_SERVICE_CANCELLATION_TOKEN";
