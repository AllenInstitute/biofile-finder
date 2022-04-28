import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { dialog, ipcMain, ipcRenderer } from "electron";

import {
    ExecutionEnvService,
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../../core/services";
import NotificationServiceElectron from "./NotificationServiceElectron";

export enum Platform {
    Mac = "darwin",
    Windows = "win32",
}

export default class ExecutionEnvServiceElectron implements ExecutionEnvService {
    public static SHOW_OPEN_DIALOG = "show-open-dialog";
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
    }

    public formatPathForOs(posixPath: string, prefix?: string): string {
        // Assumption: file paths are persisted as POSIX paths. Split accordingly...
        const originalPosixPathSplit = posixPath.split(path.posix.sep);
        const parts = prefix ? [prefix, ...originalPosixPathSplit] : originalPosixPathSplit;

        // ...then rejoin using whatever path.sep is at runtime
        return path.join(...parts);
    }

    public getFilename(filePath: string): string {
        return path.basename(filePath, path.extname(filePath));
    }

    public getOS(): string {
        return os.type();
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

            const isValidExecutable = await this.isValidExecutable(executablePath);
            if (isValidExecutable) {
                return executablePath;
            } else {
                // Alert user to error with executable location
                await this.notificationService.showError(
                    promptTitle,
                    `Whoops! ${executablePath} is not verifiably an executable on your computer. Select the same application you would use to open the app.`
                );
            }
        }
    }

    public async isValidExecutable(executablePath: string): Promise<boolean> {
        if (executablePath === SystemDefaultAppLocation) {
            return true;
        }
        try {
            // On macOS, applications are bundled as packages. `executablePath` is expected to be a package.
            if (os.platform() === Platform.Mac) {
                if (executablePath.endsWith(".app")) {
                    const pathStat = await fs.promises.stat(executablePath);
                    if (pathStat.isDirectory()) {
                        return true;
                    }
                }
                return false;
            }
            await fs.promises.access(executablePath, fs.constants.X_OK);
            return true;
        } catch (_) {
            return false;
        }
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
