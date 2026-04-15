import { lt, valid } from "semver";

import {
    PersistentConfigService,
    PersistedConfig,
    PersistedConfigKeys,
} from "../../../core/services";

interface PersistentConfigServiceWebOptions {
    clearExistingData?: boolean;
}

// Manually manage version
const CURRENT_VERSION = "1.0.0";
const VERSION_KEY = "BFF_PERSISTED_CONFIG_VERSION";

// Use browser localstorage to persist data between sessions
export default class PersistentConfigServiceWeb implements PersistentConfigService {
    public constructor(options: PersistentConfigServiceWebOptions = {}) {
        if (options.clearExistingData) {
            localStorage.clear();
        }
        // Check if localStorage has a stale version number
        const storedVersion = localStorage.getItem(VERSION_KEY);
        if (storedVersion !== CURRENT_VERSION) {
            this.migrate(storedVersion);
            // Update to new version
            localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        }
    }

    // Handle version migrations.
    // If we deprecate keys in the future, we can use this method to
    // remove/update values as needed, e.g.,
    //   if (gt(oldVersion, "1.0.1")) { // old version > 1.0.1
    //.    if (localStorage.getItem(PersistedConfigKeys.DeprecatedKey)) {
    //       localStorage.removeItem(PersistedConfigKeys.DeprecatedKey);
    //     }
    //   }
    private migrate(oldVersion: string | null) {
        // If invalid version, cannot validate stored keys
        if (!oldVersion || lt(oldVersion, "0.0.0") || !valid(oldVersion)) {
            this.clear();
        }
        return;
    }

    // localStorage only stores strings
    public get(key: PersistedConfigKeys): string | undefined {
        return localStorage.getItem(key) ?? undefined; // prefer undefined over null to match parent class
    }

    public getAll(): PersistedConfig {
        return Object.values(PersistedConfigKeys).reduce(
            (config: PersistedConfig, key) => ({
                ...config,
                [key as string]: this.get(key),
            }),
            {}
        );
    }

    public clear(): void {
        localStorage.clear();
    }

    public persist(config: PersistedConfig): void;
    public persist(key: PersistedConfigKeys, value?: string): void;
    public persist(arg: PersistedConfigKeys | PersistedConfig, value?: any) {
        if (typeof arg === "object") {
            Object.entries(arg as PersistedConfig).forEach(([key, value]) => {
                this.persist(key as PersistedConfigKeys, value);
            });
        } else if (value === undefined || value === null) {
            localStorage.removeItem(arg);
        } else {
            // setItem only accepts strings
            localStorage.setItem(arg, value);
        }
    }
}
