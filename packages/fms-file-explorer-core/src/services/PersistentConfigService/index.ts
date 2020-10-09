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
}
