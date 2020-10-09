/**
 * Interface that defines a platform-dependent service for showing files using other applications.
 */
export default interface FileViewerService {
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
     * Attempts to retrieve the stored allen drive location (if exists & valid) otherwise defaults to OS default path (if valid).
     * Returning undefined if neither stored or default allen drive are valid.
     *
     */
    getValidatedAllenDriveLocation(): Promise<string | undefined>;

    /**
     * Attempts to retrieve the stored ImageJ executable location (if exists & valid) otherwise returns undefined
     *
     */
    getValidatedImageJLocation(): Promise<string | undefined>;

    /**
     * Verifies that the given file path is a valid allen drive mount point
     *
     * @param allenDrivePath Path to allen drive
     */
    isValidAllenMountPoint(allenDrivePath: string): Promise<boolean>;

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
