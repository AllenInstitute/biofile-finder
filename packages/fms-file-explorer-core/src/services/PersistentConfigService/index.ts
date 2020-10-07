/**
 * Keys for the saved by this service
 */
export enum PersistedDataKeys {
    AllenMountPoint = "ALLEN_MOUNT_POINT",
    CsvColumns = "CSV_COLUMNS",
    ImageJExecutable = "IMAGE_J_EXECUTABLE",
}

/**
 * Interface that defines a platform-dependent service for persistent configuration data.
 */
export default interface PersistentConfigService {
    /**
     * Retrieve the config value for the given key. Returns undefined if not present.
     */
    get(key: PersistedDataKeys): any;

    /**
     * Save the config value at the given key. Overwrites any existing data for the key.
     */
    set(key: PersistedDataKeys, value: any): void;

    /**
     * Prompts the user for the allen mount point location & saves for future use.
     * Will first notify the user of this request if specified.
     */
    setAllenMountPoint(promptFirst?: boolean): Promise<string>;

    /**
     * Prompts the user for the Image J executable location & saves for future use.
     * Will first notify the user of this request if specified.
     */
    setImageJExecutableLocation(promptFirst?: boolean): Promise<string>;
}

/**
 * Sentinel value used to send and check for cancellation of a persistent config action.
 */
export const PersistentConfigCancellationToken =
    "FMS_EXPLORER_PERSISTENT_CONFIG_SERVICE_CANCELLATION_TOKEN";
