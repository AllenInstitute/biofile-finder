/**
 * Interface that defines a platform-dependent service for showing files using other applications.
 */
export default interface FileViewerService {
    /**
     * Opens the given files in ImageJ
     * 
     * @param filePaths The paths to the files to open
     * @param imageJExecutable Path to ImageJ executable to run commands against.
     */
    openFilesInImageJ(filePaths: string[], imageJExecutable: string): Promise<void>;
}
