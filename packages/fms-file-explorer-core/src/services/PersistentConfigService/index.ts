/**
 * Keys for the saved by this service
 */
export enum SavedDataKey {
    AllenMountPoint = "ALLEN_MOUNT_POINT",
    CsvColumns = "CSV_COLUMNS",
}

/**
 * Interface that defines a platform-dependent service for persistent configuration data.
 */
export default interface PersistentConfigService {
    /**
     * Retrieve the config value for the given key. Returns undefined if not present.
     */
    get(key: SavedDataKey): any;

    /**
     * Save the config value at the given key. Overwrites any existing data for the key.
     */
    set(key: SavedDataKey, value: any): void;

    /**
     * Prompts the user for the allen mount point location & saves for future use.
     */
    setAllenMountPoint(): Promise<string>;
}

/**
 * Sentinel value used to send and check for cancellation of a persistent config action.
 */
export const PersistentConfigCancellationToken =
    "FMS_EXPLORER_PERSISTENT_CONFIG_SERVICE_CANCELLATION_TOKEN";
