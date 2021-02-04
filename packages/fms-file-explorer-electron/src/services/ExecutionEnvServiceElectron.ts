import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";

import { ExecutionEnvService } from "@aics/fms-file-explorer-core";
import { dialog, ipcMain, ipcRenderer } from "electron";

import NotificationServiceElectron from "./NotificationServiceElectron";
import { GlobalVariableChannels } from "../util/constants";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    ExecutableEnvCancellationToken,
} = require("@aics/fms-file-explorer-core/nodejs/services/ExecutionEnvService");

// These are paths known (and unlikely to change) inside the allen drive that any given user should
// have access to
export const KNOWN_FOLDERS_IN_ALLEN_DRIVE = ["programs", "aics"].map((f) => path.normalize(f));

enum Platform {
    Mac = "darwin",
    Windows = "win32",
}

export default class ExecutionEnvServiceElectron implements ExecutionEnvService {
    public static SHOW_OPEN_DIALOG = "show-open-dialog";
    public static PROMPT_ALLEN_MOUNT_POINT = "prompt-allen-mount-point";
    public static PROMPT_IMAGE_J_LOCATION = "prompt-image-j-location";
    private notificationService: NotificationServiceElectron;

    public static registerIpcHandlers() {
        // Handle opening a native file browser dialog
        ipcMain.handle(
            ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG,
            (_, dialogOptions: Electron.OpenDialogOptions) => {
                return dialog.showOpenDialog({
                    defaultPath: path.resolve("/"),
                    buttonLabel: "Select",
                    ...dialogOptions,
                });
            }
        );

        // Relay the selected Allen mount point to a listener in the renderer process
        ipcMain.on(GlobalVariableChannels.AllenMountPoint, (event, allenPath) => {
            event.reply(GlobalVariableChannels.AllenMountPoint, allenPath);
        });

        // Relay the selected ImageJ/Fiji executable to a listener in the renderer process
        ipcMain.on(GlobalVariableChannels.ImageJExecutable, (event, imageJExecutable) => {
            event.reply(GlobalVariableChannels.ImageJExecutable, imageJExecutable);
        });
    }

    private static getDefaultOpenDialogOptions(
        platform: NodeJS.Platform
    ): Partial<Electron.OpenDialogOptions> {
        // MacOS
        if (platform === Platform.Mac) {
            return {
                defaultPath: path.normalize("/Applications/"),
                filters: [{ name: "Executable", extensions: ["app"] }],
            };
        }
        // Windows
        if (platform === Platform.Windows) {
            return {
                defaultPath: os.homedir(),
                filters: [{ name: "Executable", extensions: ["exe"] }],
            };
        }
        return {
            defaultPath: os.homedir(),
            filters: [{ name: "Executable", extensions: ["*"] }],
        };
    }

    public constructor(notificationService: NotificationServiceElectron) {
        this.notificationService = notificationService;
        ipcRenderer.removeAllListeners(ExecutionEnvServiceElectron.PROMPT_ALLEN_MOUNT_POINT);
        ipcRenderer.on(ExecutionEnvServiceElectron.PROMPT_ALLEN_MOUNT_POINT, async () => {
            const allenPath = await this.promptForAllenMountPoint();
            if (allenPath !== ExecutableEnvCancellationToken) {
                // Pass the selected Allen mount point on to the global variables
                ipcRenderer.send(GlobalVariableChannels.AllenMountPoint, allenPath);
            }
        });

        ipcRenderer.removeAllListeners(ExecutionEnvServiceElectron.PROMPT_IMAGE_J_LOCATION);
        ipcRenderer.on(ExecutionEnvServiceElectron.PROMPT_IMAGE_J_LOCATION, async () => {
            const imageJExecutable = await this.promptForExecutable("ImageJ/Fiji Executable");
            if (imageJExecutable !== ExecutableEnvCancellationToken) {
                // Pass the selected ImageJ/Fiji executable on to the global variables
                ipcRenderer.send(GlobalVariableChannels.ImageJExecutable, imageJExecutable);
            }
        });
    }

    public formatPathForOs(posixPath: string, prefix?: string): string {
        // Assumption: file paths are persisted as POSIX paths. Split accordingly...
        const originalPosixPathSplit = posixPath.split(path.posix.sep);
        const parts = prefix ? [prefix, ...originalPosixPathSplit] : originalPosixPathSplit;

        // ...then rejoin using whatever path.sep is at runtime
        return path.join(...parts);
    }

    public getOS(): string {
        return os.type();
    }

    public async promptForAllenMountPoint(displayMessageBeforePrompt?: boolean): Promise<string> {
        if (displayMessageBeforePrompt) {
            const result = await this.notificationService.showMessage(
                "Allen Drive Mount Point",
                "It appears that your Allen Drive isn't where we thought it would be. " +
                    "Select your Allen Drive Mount Point location now?"
            );
            if (!result) {
                return ExecutableEnvCancellationToken;
            }
        }
        // Continuously try to set a valid allen drive mount point unless the user cancels
        while (true) {
            const allenPath = await this.selectPath({
                properties: ["openDirectory"],
                title: "Select Allen drive mount point",
            });

            if (allenPath === ExecutableEnvCancellationToken) {
                return ExecutableEnvCancellationToken;
            }

            const isValidAllenPath = await this.isValidAllenMountPoint(allenPath);
            if (isValidAllenPath) {
                return allenPath;
            }

            await this.notificationService.showError(
                "Allen Drive Mount Point Selection",
                `Whoops! ${allenPath} is not verifiably the root of the Allen drive on your computer. Select the parent folder to the "/aics" and "/programs" folders. For example, "/allen," "/Users/johnd/allen," etc.`
            );
        }
    }

    public async promptForExecutable(
        promptTitle: string,
        reasonForPrompt?: string
    ): Promise<string> {
        if (reasonForPrompt) {
            const result = await this.notificationService.showMessage(promptTitle, reasonForPrompt);
            if (!result) {
                return ExecutableEnvCancellationToken;
            }
        }

        // Continuously try to set a valid executable location until the user cancels
        while (true) {
            const platform = os.platform();

            const executablePath = await this.selectPath({
                ...ExecutionEnvServiceElectron.getDefaultOpenDialogOptions(platform),
                properties: ["openFile"],
                title: promptTitle,
            });

            if (executablePath === ExecutableEnvCancellationToken) {
                return ExecutableEnvCancellationToken;
            }

            try {
                const executable = await this.resolveExecutable(executablePath);
                return executable;
            } catch (_) {
                // Alert user to error with executable location
                await this.notificationService.showError(
                    promptTitle,
                    `Whoops! ${executablePath} is not verifiably an executable on your computer. Select the same application you would use to open the app.`
                );
            }
        }
    }

    public async isValidAllenMountPoint(allenPath: string): Promise<boolean> {
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

    public async isValidExecutable(executablePath: string): Promise<boolean> {
        try {
            await fs.promises.access(executablePath, fs.constants.X_OK);
            return true;
        } catch (_) {
            return false;
        }
    }

    private async resolveExecutable(executablePath: string): Promise<string> {
        let executablePathForOs = executablePath;
        // On macOS, applications are bundled as packages. At this point, `executablePath` is expected to be a package. Inspect the package's Info.plist to determine
        // the name of the _actual_ executable to use.
        if (os.platform() === Platform.Mac) {
            const infoPlistPath = path.join(executablePath, "Contents", "Info.plist");
            const infoPListStat = await fs.promises.stat(infoPlistPath);

            if (!infoPListStat.isFile()) {
                return Promise.reject(
                    `No P-List available for executable ${executablePath}, cannot determine actual executable source`
                );
            }

            const plistParser = await import("simple-plist");
            const promisifiedPlistReader = util.promisify(plistParser.readFile);
            const plist = await promisifiedPlistReader(infoPlistPath);

            executablePathForOs = path.join(
                executablePath,
                "Contents",
                "MacOS",
                plist.CFBundleExecutable
            );
        }

        const isValidExecutable = await this.isValidExecutable(executablePathForOs);
        if (!isValidExecutable) {
            return Promise.reject(
                `Unable to verify that executable ${executablePathForOs} is valid`
            );
        }
        return executablePathForOs;
    }

    // Prompts user using native file browser for a file path
    private async selectPath(dialogOptions: Electron.OpenDialogOptions): Promise<string> {
        const result = await ipcRenderer.invoke(
            ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG,
            dialogOptions
        );
        if (result.canceled || !result.filePaths.length) {
            return ExecutableEnvCancellationToken;
        }
        return result.filePaths[0];
    }
}
