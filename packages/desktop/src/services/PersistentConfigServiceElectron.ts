import * as os from "os";
import * as path from "path";

import Store, { Schema } from "electron-store";

import {
    PersistentConfigService,
    PersistedConfig,
    PersistedConfigKeys,
} from "../../../core/services";

// Defines a validation schema for data inserted into the persistent storage
// if a breaking change is made see migration patterns in elecron-store docs
const STORAGE_SCHEMA: Schema<Record<string, unknown>> = {
    [PersistedConfigKeys.AllenMountPoint]: {
        type: "string",
    },
    [PersistedConfigKeys.CsvColumns]: {
        type: "array",
        items: {
            type: "string",
        },
    },
    [PersistedConfigKeys.ImageJExecutable]: {
        type: "string",
    },
    [PersistedConfigKeys.UserSelectedApplications]: {
        type: "array",
        items: {
            type: "object",
        },
    },
};

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    private store: Store;

    private static getDefault(key: PersistedConfigKeys) {
        if (key === PersistedConfigKeys.AllenMountPoint) {
            return os.platform() === "win32" ? "\\\\allen" : path.normalize("/allen");
        }
        return undefined;
    }

    public constructor(options: PersistentConfigServiceElectronOptions = {}) {
        this.store = new Store({ schema: STORAGE_SCHEMA });
        if (options.clearExistingData) {
            this.store.clear();
        }
    }

    public get(key: PersistedConfigKeys): any {
        return this.store.get(key, PersistentConfigServiceElectron.getDefault(key));
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

    public persist(config: PersistedConfig): void;
    public persist(key: PersistedConfigKeys, value: any): void;
    public persist(arg: PersistedConfigKeys | PersistedConfig, value?: any) {
        if (typeof arg === "object") {
            Object.entries(arg as PersistedConfig).forEach(([key, value]) => {
                this.persist(key as PersistedConfigKeys, value);
            });
        } else if (value === undefined || value === null) {
            this.store.delete(arg);
        } else {
            this.store.set(arg, value);
        }
    }
}
