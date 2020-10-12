import Store, { Schema } from "electron-store";

import { PersistentConfigService } from "@aics/fms-file-explorer-core";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistedDataKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");

// Defines a validation schema for data inserted into the persistent storage
// if a breaking change is made see migration patterns in elecron-store docs
const STORAGE_SCHEMA: Schema<Record<string, unknown>> = {
    [PersistedDataKeys.AllenMountPoint]: {
        type: "string",
    },
    [PersistedDataKeys.CsvColumns]: {
        type: "array",
        items: {
            type: "string",
        },
    },
    [PersistedDataKeys.ImageJExecutable]: {
        type: "string",
    },
};

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    private store: Store;

    public constructor(options: PersistentConfigServiceElectronOptions = {}) {
        this.store = new Store({ schema: STORAGE_SCHEMA });
        if (options.clearExistingData) {
            this.store.clear();
        }
    }

    public get(key: typeof PersistedDataKeys): any {
        return this.store.get(key);
    }

    public set(key: typeof PersistedDataKeys, value: any): void {
        this.store.set(key, value);
    }
}
