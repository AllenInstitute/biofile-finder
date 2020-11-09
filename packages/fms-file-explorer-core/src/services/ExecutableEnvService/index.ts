/**
 * Interface that defines a platform-dependent service for prompting users about executables.
 */
export default interface ExecutableEnvService {
    /**
     * Prompts the user for the allen mount point location.
     * Will first notify the user of this request if a prompt message is specified.
     *
     * @param displayMessageBeforePrompt If true, will first display a message to the user notifying them of
     * the reason for the prompt before actually prompting them for the allen drive using their native file browser.
     */
    promptForAllenMountPoint(displayMessageBeforePrompt: boolean): Promise<string>;

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
     * Verifies that the given file path is a valid allen drive mount point for the current OS.
     *
     * @param allenPath Path to allen drive
     */
    isValidAllenMountPoint(allenPath: string): Promise<boolean>;

    /**
     * Verifies that the given path leads to a valid executable for the current OS.
     *
     * @param executablePath Path to the executable
     */
    isValidExecutable(executablePath: string): Promise<boolean>;
}

/**
 * Sentinel value used to send and check for cancellation of a executable prompt.
 */
export const ExecutableEnvCancellationToken =
    "FMS_EXPLORER_EXECUTABLE_ENV_SERVICE_CANCELLATION_TOKEN";
