import Store, { Schema } from "electron-store";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { dialog, ipcMain, ipcRenderer } from "electron";

import SystemNotificationServiceElectron from "./SystemNotificationServiceElectron";

import { PersistentConfigService } from "@aics/fms-file-explorer-core";

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
    [PersistedDataKeys.ImageJExecutable]: {
        type: "string",
    }
};

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    public static SET_ALLEN_MOUNT_POINT = "set-allen-mount-point";
    public static SET_IMAGE_J_LOCATION = "set-image-j-location";
    public static SELECT_DIRECTORY = "select-directory";
    private store: Store;

    public constructor(options: PersistentConfigServiceElectronOptions = {}) {
        this.store = new Store({ schema: STORAGE_SCHEMA });
        if (options.clearExistingData) {
            this.store.clear();
        }

        ipcRenderer.removeAllListeners(PersistentConfigServiceElectron.SET_ALLEN_MOUNT_POINT);
        ipcRenderer.on(PersistentConfigServiceElectron.SET_ALLEN_MOUNT_POINT, () => {
            this.setAllenMountPoint();
        });

        ipcRenderer.removeAllListeners(PersistentConfigServiceElectron.SET_IMAGE_J_LOCATION);
        ipcRenderer.on(PersistentConfigServiceElectron.SET_IMAGE_J_LOCATION, () => {
            this.setImageJExecutableLocation();
        });
    }

    public static registerIpcHandlers() {
        // Handle opening a native file browser dialog for selecting a directory
        ipcMain.handle(PersistentConfigServiceElectron.SELECT_DIRECTORY, (_, dialogOptions: Electron.OpenDialogOptions) => {
            return dialog.showOpenDialog({
                defaultPath: path.resolve("/"),
                buttonLabel: "Select",
                properties: ["openFile"],
                ...dialogOptions
            });
        });
    }

    public get(key: typeof PersistedDataKeys): any {
        return this.store.get(key);
    }

    public set(key: typeof PersistedDataKeys, value: any): void {
        this.store.set(key, value);
    }

    public async setAllenMountPoint(): Promise<string> {
        const allenPath = await this.selectDirectory({
            title: "Select Allen drive point point",
        });
        if (allenPath === PersistentConfigCancellationToken) {
            return PersistentConfigCancellationToken;
        }
        this.set(PersistedDataKeys.AllenMountPoint, allenPath);
        return allenPath;
    }

    public async setImageJExecutableLocation(): Promise<string> {
        // Continuously try to set a valid Image J location until the user cancels
        while (true) {
            let extensionForOs = "*"; // Default (Linux): There is no executable extension
            if (os.platform() === 'darwin') { // Mac
                extensionForOs = 'app';
            } else if (os.platform() === 'win32') { // Windows
                extensionForOs = 'exe';
            }
            const imageJExecutable = await this.selectDirectory({
                filters: [{ name: "Executable", extensions: [extensionForOs]}],
                title: "Select Image J executable location",
            });
            if (imageJExecutable === PersistentConfigCancellationToken) {
                return PersistentConfigCancellationToken;
            }
            try {
                // Try to see if the chosen path leads to an actual executable
                await fs.promises.access(imageJExecutable, fs.constants.X_OK);
                this.set(PersistedDataKeys.ImageJExecutable, imageJExecutable);
                return imageJExecutable;
            } catch (error) {
                // Alert user to error with Image J location
                await ipcRenderer.invoke(
                    SystemNotificationServiceElectron.SHOW_ERROR_MESSAGE,
                    "Image J Executable Location",
                    `Whoops! ${imageJExecutable} is not verifiably an executable on your computer. Select the executable as you would to open Image J normally. Error: ${error}`
                );
            }
        }
    }

    private async selectDirectory(dialogOptions: Electron.OpenDialogOptions): Promise<string> {
        const result = await ipcRenderer.invoke(
            PersistentConfigServiceElectron.SELECT_DIRECTORY,
            dialogOptions
        );
        if (result.canceled || !result.filePaths.length) {
            return PersistentConfigCancellationToken;
        }
        return result.filePaths[0];
    }
}
