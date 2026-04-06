import {
    PersistentConfigService,
    PersistedConfig,
    PersistedConfigKeys,
} from "../../../core/services";

interface PersistentConfigServiceWebOptions {
    clearExistingData?: boolean;
}

// Use browser localstorage to persist data between sessions
export default class PersistentConfigServiceWeb implements PersistentConfigService {
    public constructor(options: PersistentConfigServiceWebOptions = {}) {
        if (options.clearExistingData) {
            localStorage.clear();
        }
    }

    public get(key: PersistedConfigKeys): any {
        return localStorage.getItem(key);
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
    public persist(key: PersistedConfigKeys, value: any): void;
    public persist(arg: PersistedConfigKeys | PersistedConfig, value?: any) {
        if (typeof arg === "object") {
            Object.entries(arg as PersistedConfig).forEach(([key, value]) => {
                this.persist(key as PersistedConfigKeys, value);
            });
        } else if (value === undefined || value === null) {
            localStorage.removeItem(arg);
        } else {
            localStorage.setItem(arg, value);
        }
    }
}
