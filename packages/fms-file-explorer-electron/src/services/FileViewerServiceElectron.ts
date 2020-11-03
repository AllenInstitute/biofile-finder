import childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";

import { dialog, ipcMain, ipcRenderer } from "electron";

import { FileViewerService } from "@aics/fms-file-explorer-core";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    FileViewerCancellationToken,
} = require("@aics/fms-file-explorer-core/nodejs/services/FileViewerService");
const { persistent } = require("@aics/fms-file-explorer-core/nodejs/state");

// These are paths known (and unlikely to change) inside the allen drive that any given user should
// have access to
export const KNOWN_FOLDERS_IN_ALLEN_DRIVE = ["programs", "aics"].map((f) => path.normalize(f));

export default class FileViewerServiceElectron implements FileViewerService {
    public static SET_ALLEN_MOUNT_POINT = "set-allen-mount-point";
    public static SET_IMAGE_J_LOCATION = "set-image-j-location";
    public static SHOW_ERROR_BOX = "show-error-box";
    public static SHOW_MESSAGE_BOX = "show-message-box";
    public static SHOW_OPEN_DIALOG = "show-open-dialog";
    private dispatch?: CallableFunction;

    public static registerIpcHandlers() {
        // Handle opening a native file browser dialog
        ipcMain.handle(
            FileViewerServiceElectron.SHOW_OPEN_DIALOG,
            (_, dialogOptions: Electron.OpenDialogOptions) => {
                return dialog.showOpenDialog({
                    defaultPath: path.resolve("/"),
                    buttonLabel: "Select",
                    ...dialogOptions,
                });
            }
        );

        // Handle displaying an error in the native error box
        ipcMain.handle(FileViewerServiceElectron.SHOW_ERROR_BOX, (_, title, content) => {
            return dialog.showErrorBox(title, content);
        });

        // Handle displaying a message in the native error box, returns true if the "Yes" button was chosen
        ipcMain.handle(FileViewerServiceElectron.SHOW_MESSAGE_BOX, async (_, title, message) => {
            const { response } = await dialog.showMessageBox({
                buttons: ["No", "Yes"],
                cancelId: 0,
                message,
                title,
                type: "info",
            });
            return response === 1;
        });
    }

    public constructor() {
        ipcRenderer.removeAllListeners(FileViewerServiceElectron.SET_ALLEN_MOUNT_POINT);
        ipcRenderer.on(FileViewerServiceElectron.SET_ALLEN_MOUNT_POINT, () => {
            this.selectAllenMountPoint();
        });

        ipcRenderer.removeAllListeners(FileViewerServiceElectron.SET_IMAGE_J_LOCATION);
        ipcRenderer.on(FileViewerServiceElectron.SET_IMAGE_J_LOCATION, () => {
            this.selectImageJExecutableLocation();
        });
    }

    public initialize(dispatch: CallableFunction) {
        this.dispatch = dispatch;
    }

    public async selectAllenMountPoint(promptFirst?: boolean): Promise<string> {
        // Shouldn't happen assuming instance was set up properly in App.tsx
        if (!this.dispatch) {
            const message =
                "Internal application error. The FileViewerServiceElectron was not setup properly";
            await this.showError("Allen Drive Mount Point Selection", message);
            return Promise.reject(message);
        }
        if (promptFirst) {
            const result = await this.showMessage(
                "Allen Drive Mount Point",
                "It appears that your Allen Drive isn't where we thought it would be. " +
                    "Select your Allen Drive Mount Point location now?"
            );
            if (!result) {
                return FileViewerCancellationToken;
            }
        }
        // Continuously try to set a valid allen drive mount point unless the user cancels
        while (true) {
            const allenPath = await this.selectPath({
                properties: ["openDirectory"],
                title: "Select Allen drive mount point",
            });
            if (allenPath === FileViewerCancellationToken) {
                return FileViewerCancellationToken;
            }
            // Ensure the paths exist as expected inside the drive
            const pathIsValidAllenDrive = await this.isValidAllenMountPoint(allenPath);
            if (pathIsValidAllenDrive) {
                this.dispatch(persistent.actions.setAllenMountPoint(allenPath));
                return allenPath;
            }
            // Alert user to error with allen drive
            await this.showError(
                "Allen Drive Mount Point Selection",
                `Whoops! ${allenPath} is not verifiably the root of the Allen drive on your computer. Select the parent folder to the "/aics" and "/programs" folders. For example, "/allen," "/Users/johnd/allen," etc.`
            );
        }
    }

    public async selectImageJExecutableLocation(promptFirst?: boolean): Promise<string> {
        // Shouldn't happen assuming instance was set up properly in App.tsx
        if (!this.dispatch) {
            const message =
                "Internal application error. The FileViewerServiceElectron was not setup properly";
            await this.showError("ImageJ/Fiji Executable Location", message);
            return Promise.reject(message);
        }
        if (promptFirst) {
            const result = await this.showMessage(
                "ImageJ/Fiji Executable Location",
                "It appears that your ImageJ/Fiji application isn't located where we thought it would be. " +
                    "Select your ImageJ/Fiji application now?"
            );
            if (!result) {
                return FileViewerCancellationToken;
            }
        }

        // Continuously try to set a valid ImageJ location until the user cancels
        while (true) {
            let defaultPath = os.homedir();
            let extensionForOs = "*"; // Default (Linux) There is no executable extension
            const currentPlatform = os.platform();

            if (currentPlatform === "darwin") {
                // Mac
                extensionForOs = "app";
                defaultPath = path.normalize("/Applications/");
            } else if (currentPlatform === "win32") {
                // Windows
                extensionForOs = "exe";
            }

            let imageJExecutable = await this.selectPath({
                defaultPath,
                filters: [{ name: "Executable", extensions: [extensionForOs] }],
                properties: ["openFile"],
                title: "Select ImageJ/Fiji application",
            });

            if (imageJExecutable === FileViewerCancellationToken) {
                return FileViewerCancellationToken;
            }

            let isValidExecutable;

            // On macOS, applications are bundled as packages. At this point, `imageJExecutable` is expected to be a package. Inspect the package's Info.plist to determine
            // the name of the _actual_ executable to use.
            if (currentPlatform === "darwin") {
                const infoPlistPath = path.join(imageJExecutable, "Contents", "Info.plist");

                let infoPlistExists;
                try {
                    infoPlistExists = (await fs.promises.stat(infoPlistPath)).isFile();
                } catch (_) {
                    infoPlistExists = false;
                }

                if (infoPlistExists) {
                    const plistParser = await import("simple-plist");
                    const promisifiedPlistReader = util.promisify(plistParser.readFile);

                    const plist = await promisifiedPlistReader(infoPlistPath);
                    imageJExecutable = path.join(
                        imageJExecutable,
                        "Contents",
                        "MacOS",
                        plist.CFBundleExecutable
                    );
                    isValidExecutable = await this.isValidImageJLocation(imageJExecutable);
                } else {
                    isValidExecutable = false;
                }
            } else {
                isValidExecutable = await this.isValidImageJLocation(imageJExecutable);
            }

            if (isValidExecutable) {
                this.dispatch(persistent.actions.setImageJLocation(imageJExecutable));
                return imageJExecutable;
            }

            // Alert user to error with ImageJ location
            await this.showError(
                "ImageJ/Fiji Executable Location",
                `Whoops! ${imageJExecutable} is not verifiably an executable on your computer. Select the same application you would use to open ImageJ/Fiji.`
            );
        }
    }

    public async getDefaultAllenMountPointForOs(): Promise<string | undefined> {
        // Shouldn't happen assuming instance was set up properly in App.tsx
        if (!this.dispatch) {
            const message =
                "Internal application error. The FileViewerServiceElectron was not setup properly";
            await this.showError("Allen Drive Mount Point Discovery", message);
            return Promise.reject(message);
        }
        // Attempt to guess where it is since we either don't have one stored or it isn't valid
        const defaultAllenDriveForOs =
            os.platform() === "win32" ? "\\\\allen" : path.normalize("/allen");
        if (await this.isValidAllenMountPoint(defaultAllenDriveForOs)) {
            this.dispatch(persistent.actions.setAllenMountPoint(defaultAllenDriveForOs));
            return defaultAllenDriveForOs;
        }
        return undefined;
    }

    public async isValidAllenMountPoint(allenPath?: string): Promise<boolean> {
        if (!allenPath) {
            return false;
        }
        try {
            const expectedPaths = KNOWN_FOLDERS_IN_ALLEN_DRIVE.map((f) => path.join(allenPath, f));
            await Promise.all(
                expectedPaths.map((path) => fs.promises.access(path, fs.constants.R_OK))
            );
            return true;
        } catch (_) {
            return false;
        }
    }

    public async isValidImageJLocation(imageJExecutable?: string): Promise<boolean> {
        if (!imageJExecutable) {
            return false;
        }
        try {
            await fs.promises.access(imageJExecutable, fs.constants.X_OK);
            return true;
        } catch (_) {
            return false;
        }
    }

    public async openFilesInImageJ(filePaths: string[], imageJExecutable: string) {
        const reportErrorToUser = async (error: string) => {
            await this.showError(
                "Opening file in ImageJ/Fiji",
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`
            );
        };

        try {
            // Create a child process for ImageJ to open files in
            const imageJProcess = childProcess.spawn(imageJExecutable, filePaths);
            // Handle unsuccessful startups of ImageJ (these will only be called if explorer is still open)
            imageJProcess.on("error", reportErrorToUser);
            imageJProcess.on("exit", async (code: number) => {
                if (code !== 0) {
                    await reportErrorToUser(`Status Code ${code}`);
                }
            });
        } catch (error) {
            await reportErrorToUser(error);
        }
    }

    // Prompts user using native file browser for a file path
    private async selectPath(dialogOptions: Electron.OpenDialogOptions): Promise<string> {
        const result = await ipcRenderer.invoke(
            FileViewerServiceElectron.SHOW_OPEN_DIALOG,
            dialogOptions
        );
        if (result.canceled || !result.filePaths.length) {
            return FileViewerCancellationToken;
        }
        return result.filePaths[0];
    }

    private async showError(title: string, message: string) {
        return await ipcRenderer.invoke(FileViewerServiceElectron.SHOW_ERROR_BOX, title, message);
    }

    private async showMessage(title: string, message: string) {
        return await ipcRenderer.invoke(FileViewerServiceElectron.SHOW_MESSAGE_BOX, title, message);
    }
}
