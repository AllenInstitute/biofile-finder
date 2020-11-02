import { Dispatch } from "react";
import Store, { Schema } from "electron-store";

import { PersistentConfigService } from "@aics/fms-file-explorer-core";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistedConfigKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");
const { selection } = require("@aics/fms-file-explorer-core/nodejs/state");

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
    private dispatch?: Dispatch<any>;

    public constructor(options: PersistentConfigServiceElectronOptions = {}) {
        this.store = new Store({ schema: STORAGE_SCHEMA });
        if (options.clearExistingData) {
            this.store.clear();
        }
    }

    public setup(dispatch: Dispatch<any>) {
        this.dispatch = dispatch;
    }

    public get(key: typeof PersistedConfigKeys): any {
        return this.store.get(key);
    }

    public set(key: typeof PersistedConfigKeys, value: any): void {
        this.store.set(key, value);
        if (this.dispatch) {
            this.dispatch(selection.action.updatePersistedConfig({ [key]: value }));
        }
    }
}
