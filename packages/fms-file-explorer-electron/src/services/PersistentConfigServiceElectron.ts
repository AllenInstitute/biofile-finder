import * as os from "os";
import * as path from "path";

import { PersistentConfigService, PersistedConfig } from "@aics/fms-file-explorer-core";
import Store, { Schema } from "electron-store";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistedConfigKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");

type PersistedConfigKeysType = typeof PersistedConfigKeys;

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
};

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    private store: Store;

    private static getDefault(key: PersistedConfigKeysType) {
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

    public get(key: PersistedConfigKeysType): any {
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
    public persist(key: PersistedConfigKeysType, value: any): void;
    public persist(arg: PersistedConfigKeysType | PersistedConfig, value?: any) {
        if (typeof arg === "object") {
            Object.entries(arg).forEach(([key, value]) => {
                this.persist(key, value);
            });
        } else if (value === undefined || value === null) {
            this.store.delete(arg);
        } else {
            this.store.set(arg, value);
        }
    }
}
