/**
 * Interface that defines a platform-dependent service for prompting users about executables.
 */
export default interface ExecutableEnvService {
    /**
     * Prompts the user for the allen mount point location.
     * Will first notify the user of this request if a prompt message is specified.
     *
     * @param shouldPrompt If true, will first prompt the user notifying them of the request before showing the native browser.
     */
    promptForAllenMountPoint(shouldPrompt: boolean): Promise<string>;

    /**
     * Prompts the user for an executable.
     * Will first notify the user of this request if a prompt message is specified.
     *
     * @param promptTitle Title to display in native system applications.
     * @param promptMessage (Optional) if present will prompt the user with the message before opening the native file browser.
     */
    promptForExecutable(promptTitle: string, promptMessage?: string): Promise<string>;

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
