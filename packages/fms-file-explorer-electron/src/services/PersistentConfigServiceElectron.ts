import Store, { Schema } from "electron-store";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { dialog, ipcMain, ipcRenderer } from "electron";

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

// These are paths known (and unlikely to change) inside the allen drive that any given user should
// have access to
export const KNOWN_PATHS_IN_ALLEN_DRIVE = ["/programs", "/aics"];

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    public static SET_ALLEN_MOUNT_POINT = "set-allen-mount-point";
    public static SET_IMAGE_J_LOCATION = "set-image-j-location";
    public static SHOW_ERROR_BOX = "show-error-box";
    public static SHOW_OPEN_DIALOG = "show-open-dialog";
    private store: Store;

    private static async isAllenPathValid(allenPath: string): Promise<boolean> {
        try {
            await Promise.all(KNOWN_PATHS_IN_ALLEN_DRIVE.map(path => fs.promises.access(allenPath + path, fs.constants.R_OK)));
            return true;
        } catch (error) {
            return false;
        }
    }

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
        // Handle opening a native file browser dialog
        ipcMain.handle(PersistentConfigServiceElectron.SHOW_OPEN_DIALOG, (_, dialogOptions: Electron.OpenDialogOptions) => {
            return dialog.showOpenDialog({
                defaultPath: path.resolve("/"),
                buttonLabel: "Select",
                ...dialogOptions
            });
        });

        // Handle displaying an error in the native error box
        ipcMain.handle(PersistentConfigServiceElectron.SHOW_ERROR_BOX, (_, title, content) => {
            return dialog.showErrorBox(title, content);
        });
    }

    public get(key: typeof PersistedDataKeys): any {
        return this.store.get(key);
    }

    public set(key: typeof PersistedDataKeys, value: any): void {
        this.store.set(key, value);
    }

    public async setAllenMountPoint(): Promise<string> {
        // Continuously try to set a valid allen drive mount point unless the user cancels
        while (true) {
            const allenPath = await this.selectPath({
                properties: ["openDirectory"],
                title: "Select Allen drive mount point",
            });
            if (allenPath === PersistentConfigCancellationToken) {
                return PersistentConfigCancellationToken;
            }
            // Ensure the paths exist as expected inside the drive
            const pathIsValidAllenDrive = await PersistentConfigServiceElectron.isAllenPathValid(allenPath)
            if (pathIsValidAllenDrive) {
                this.set(PersistedDataKeys.AllenMountPoint, allenPath);
                return allenPath;
            }
            // Alert user to error with allen drive
            await ipcRenderer.invoke(
                PersistentConfigServiceElectron.SHOW_ERROR_BOX,
                "Allen Drive Mount Point Selection",
                `Whoops! ${allenPath} is not verifiably the root of the Allen drive on your computer. Select the parent folder to the "/aics" and "/programs" folders. For example, "/allen," "/Users/johnd/allen," etc.`
            );
        }
    }

    public async setImageJExecutableLocation(): Promise<string> {
        // Continuously try to set a valid Image J location until the user cancels
        while (true) {
            const currentPlatform = os.platform();
            let extensionForOs = "*"; // Default (Linux): There is no executable extension
            if (currentPlatform === 'darwin') { // Mac
                extensionForOs = 'app';
            } else if (currentPlatform === 'win32') { // Windows
                extensionForOs = 'exe';
            }
            let imageJExecutable = await this.selectPath({
                filters: [{ name: "Executable", extensions: [extensionForOs]}],
                properties: ["openFile"],
                title: "Select ImageJ/Fiji executable location",
            });
            if (imageJExecutable === PersistentConfigCancellationToken) {
                return PersistentConfigCancellationToken;
            }
            // If on MacOS we have to specify the inner executable
            if (currentPlatform === 'darwin') {
                imageJExecutable += '/Contents/MacOS/ImageJ-macosx';
            }
            try {
                // Try to see if the chosen path leads to an actual executable
                await fs.promises.access(imageJExecutable, fs.constants.X_OK);
                this.set(PersistedDataKeys.ImageJExecutable, imageJExecutable);
                return imageJExecutable;
            } catch (error) {
                // Alert user to error with Image J location
                await ipcRenderer.invoke(
                    PersistentConfigServiceElectron.SHOW_ERROR_BOX,
                    "ImageJ/Fiji Executable Location",
                    `Whoops! ${imageJExecutable} is not verifiably an executable on your computer. Select the executable as you would to open Image J normally. Error: ${error}`
                );
            }
        }
    }

    // Prompts user using native file browser for a file path
    private async selectPath(dialogOptions: Electron.OpenDialogOptions): Promise<string> {
        const result = await ipcRenderer.invoke(
            PersistentConfigServiceElectron.SHOW_OPEN_DIALOG,
            dialogOptions
        );
        if (result.canceled || !result.filePaths.length) {
            return PersistentConfigCancellationToken;
        }
        return result.filePaths[0];
    }
}
