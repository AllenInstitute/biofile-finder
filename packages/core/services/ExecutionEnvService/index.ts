/**
 * Interface that defines a platform-dependent service for prompting users about executables.
 */
export default interface ExecutionEnvService {
    /**
     * Return file system path formatted for use on the current operating system.
     * Assumes input is POSIX path.
     */
    formatPathForOs(posixPath: string, prefix?: string): string;

    /**
     * Return file name from path. Removes extension as well.
     */
    getFilename(filePath: string): string;

    /**
     * Return operating system. If running in the browser, expect the return value "Browser".
     */
    getOS(): string;

    /**
     * Prompts the user for an executable.
     * Will first notify the user of this request if a prompt message is specified.
     *
     * @param promptTitle Title to display in native system applications.
     * @param reasonForPrompt (Optional) If present, will first display a message to the user notifying them of
     * the reason for the prompt before actually prompting them for the executable path using their native file browser.
     */
    promptForExecutable(promptTitle: string, reasonForPrompt?: string): Promise<string>;

    /**
     * Verifies that the given path leads to a valid executable for the current OS.
     *
     * @param executablePath Path to the executable
     */
    isValidExecutable(executablePath: string): Promise<boolean>;
}

/**
 * Sentinal value used to open files using the system default application.
 */
export const SystemDefaultAppLocation = "SYSTEM_DEFAULT_APP_LOCATION";

/**
 * Sentinel value used to send and check for cancellation of a executable prompt.
 */
export const ExecutableEnvCancellationToken =
    "FMS_EXPLORER_EXECUTABLE_ENV_SERVICE_CANCELLATION_TOKEN";
