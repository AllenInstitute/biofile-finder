/**
 * Interface that defines a platform-dependent service for persistent configuration data.
 */
export default interface PersistentConfigService {
    /**
     * Retrieve the config value for the given key. Returns undefined if not present.
     */
    get(key: string): any;

    /**
     * Save the config value at the given key. Overwrites any existing data for the key.
     */
    set(key: string, value: any): void;
}
