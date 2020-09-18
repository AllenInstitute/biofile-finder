import Store, { Schema } from "electron-store";
import * as path from "path";

import { dialog, ipcMain, ipcRenderer } from "electron";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistentConfigCancellationToken,
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
};

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    public static SET_ALLEN_MOUNT_POINT = "get-allen-mount-point";
    public static SELECT_ALLEN_MOUNT_POINT = "select-allen-mount-point";
    private store: Store;

    public constructor(options: PersistentConfigServiceElectronOptions = {}) {
        this.store = new Store({ schema: STORAGE_SCHEMA });
        if (options.clearExistingData) {
            this.store.clear();
        }

        ipcRenderer.on(PersistentConfigServiceElectron.SET_ALLEN_MOUNT_POINT, () => {
            this.setAllenMountPoint();
        });
    }

    public static registerIpcHandlers() {
        ipcMain.handle(PersistentConfigServiceElectron.SELECT_ALLEN_MOUNT_POINT, () => {
            return dialog.showOpenDialog({
                title: "Select allen drive mount point",
                defaultPath: path.resolve("/"),
                buttonLabel: "Select",
                // filters: [{ name: "CSV files", extensions: ["csv"] }],
                properties: ["openDirectory"],
            });
        });
    }

    public get(key: PersistedDataKeys): any {
        return this.store.get(key);
    }

    public set(key: PersistedDataKeys, value: any): void {
        this.store.set(key, value);
    }

    public async setAllenMountPoint(): Promise<string> {
        const result = await ipcRenderer.invoke(
            PersistentConfigServiceElectron.SELECT_ALLEN_MOUNT_POINT
        );
        if (result.canceled || !result.filePaths.length) {
            return Promise.resolve(PersistentConfigCancellationToken);
        }
        const allenPath = result.filePaths[0];
        this.set(PersistedDataKeys.AllenMountPoint, allenPath);
        return Promise.resolve(allenPath);
    }
}
