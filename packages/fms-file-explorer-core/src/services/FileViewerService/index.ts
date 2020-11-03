/**
 * Interface that defines a platform-dependent service for showing files using other applications.
 */
export default interface FileViewerService {
    /**
     * Setup the FileViewerService so that it can dispatch events to the application state.
     */
    initialize(dispatch: CallableFunction): void;

    /**
     * Prompts the user for the allen mount point location & saves for future use.
     * Will first notify the user of this request if specified.
     *
     * @param promptFirst If true, will first prompt the user notifying them of th need to select an Allen Drive location
     */
    selectAllenMountPoint(promptFirst?: boolean): Promise<string>;

    /**
     * Prompts the user for the Image J executable location & saves for future use.
     * Will first notify the user of this request if specified.
     *
     * @param promptFirst If true, will first prompt the user notifying them of th need to select an ImageJ location
     */
    selectImageJExecutableLocation(promptFirst?: boolean): Promise<string>;

    /**
     * Attempts to determine a valid default path for the Allen Drive based on the current OS.
     */
    getDefaultAllenMountPointForOs(): Promise<string | undefined>;

    /**
     * Verifies that the given file path is a valid allen drive mount point
     *
     * @param allenDrivePath Path to allen drive
     */
    isValidAllenMountPoint(allenDrivePath?: string): Promise<boolean>;

    /**
     * Verifies that the given file path is a valid ImageJ/Fiji executable
     *
     * @param imageJLocation Path to ImageJ/Fiji executable
     */
    isValidImageJLocation(imageJLocation?: string): Promise<boolean>;

    /**
     * Opens the given files in ImageJ
     *
     * @param filePaths The paths to the files to open
     * @param imageJExecutable Path to ImageJ executable to run commands against.
     */
    openFilesInImageJ(filePaths: string[], imageJExecutable: string): Promise<void>;
}

/**
 * Sentinel value used to send and check for cancellation of a persistent config action.
 */
export const FileViewerCancellationToken = "FMS_EXPLORER_FILE_VIEWER_SERVICE_CANCELLATION_TOKEN";
