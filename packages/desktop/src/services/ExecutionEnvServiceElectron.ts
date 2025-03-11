import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { dialog, ipcMain, ipcRenderer, shell } from "electron";
import { existsSync } from "fs";

import {
    ExecutionEnvService,
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../../core/services";
import FmsFilePath from "../domain/FmsFilePath";
import NotificationServiceElectron from "./NotificationServiceElectron";
import FileDetail from "../../../core/entity/FileDetail";
import { FileNotFoundError } from "../../../core/errors";

// Output of os.type()
type OSType = "Linux" | "Darwin" | "Windows_NT";

export default class ExecutionEnvServiceElectron implements ExecutionEnvService {
    public static SHOW_OPEN_DIALOG = "show-open-dialog";
    private notificationService: NotificationServiceElectron;

    // Used to cache output of ExecutionEnvServiceElectron::probeForMountPoint
    private mountPoint: string | null = null;

    // Used to cache output of ExecutionEnvServiceElectron::getOS
    private OS: OSType | null = null;

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
        if (platform === "darwin") {
            return {
                defaultPath: path.normalize("/Applications/"),
                filters: [{ name: "Executable", extensions: ["app"] }],
            };
        }
        // Windows
        if (platform === "win32") {
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

    public async formatPathForHost(posixPath: string): Promise<string> {
        const fmsPath = new FmsFilePath(posixPath);

        if (this.getOS() === "Darwin") {
            const mountPoint = await this.probeForMountPoint(fmsPath.fileShare);
            if (mountPoint) {
                return fmsPath.withMountPoint(mountPoint).formatForOs(this.getOS());
            }
        }

        return fmsPath.formatForOs(this.getOS());
    }

    public getFilename(filePath: string): string {
        return path.basename(filePath, path.extname(filePath));
    }

    public getOS(): OSType {
        if (!this.OS) {
            this.OS = os.type() as OSType;
        }
        return this.OS;
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

    public async promptForFile(extensions?: string[], reasonForPrompt?: string): Promise<string> {
        const promptTitle = `Select a file ${
            extensions ? `with extension ${extensions.join(", ")}` : ""
        }`;
        if (reasonForPrompt) {
            const result = await this.notificationService.showMessage(promptTitle, reasonForPrompt);
            if (!result) {
                return ExecutableEnvCancellationToken;
            }
        }

        // Continuously try to set a valid executable location until the user cancels
        const platform = os.platform();
        while (true) {
            const filePath = await this.selectPath({
                ...ExecutionEnvServiceElectron.getDefaultOpenDialogOptions(platform),
                properties: ["openFile"],
                filters: extensions ? [{ extensions, name: extensions.join(", ") }] : undefined,
                title: promptTitle,
            });

            if (filePath === ExecutableEnvCancellationToken) {
                return ExecutableEnvCancellationToken;
            }

            const isReadableFile = await this.isReadableFile(filePath);
            if (isReadableFile) {
                return filePath;
            } else {
                // Alert user to error with file path
                await this.notificationService.showError(
                    promptTitle,
                    `Whoops! ${filePath} is not verifiably readable by you on your computer.`
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
            if (this.getOS() === "Darwin") {
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

    public async isReadableFile(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath, fs.constants.R_OK);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Determine where mount point for `fileShare` exists on this host.
     * Expected to only be needed on macOS: on Linux, `fileShare` is expected
     * to be found at `/allen/<fileShare`; on Windows, `fileShare` is expected
     * to be found at `\\allen\<fileShare>`.
     *
     * Implementation: return first non-empty path within either `/Volumes` or
     * `os.homedir()` that matches `fileShare`.
     * This could alternately be accomplished via a lookup (e.g., parse output of `mount`),
     * but that is complicated by how different types of mounts (e.g., `smbfs` versus `macfuse`)
     * are displayed by `mount`.
     *
     * Additional context: https://aicsjira.corp.alleninstitute.org/browse/UR-31
     */
    protected async probeForMountPoint(fileShare: string): Promise<string | null> {
        if (!this.mountPoint) {
            const POSSIBLE_BASE_LOCATIONS = [
                // Most likely location, particularly when using this application while in the 615 Westlake building.
                // Accomplished by: "Go" -> "Connect to server" -> "smb://allen/programs"
                "/Volumes",

                // Somewhat niche case, but here to enable making use of `sshfs`
                // when working outside of the 615 Westlake building.
                // If/when SMB/NFS is allowed through the Institute's firewall, this can be safely deleted.
                os.homedir(),
            ];
            for (const base of POSSIBLE_BASE_LOCATIONS) {
                const possibleMount = path.join(base, fileShare);
                try {
                    const content = await fs.promises.readdir(possibleMount);
                    if (content.length) {
                        this.mountPoint = possibleMount;
                        break;
                    }
                } catch (_) {
                    // Swallow.
                }
            }
        }

        return Promise.resolve(this.mountPoint);
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

    // Open the user's native file browser at the localPath of the given file
    public openNativeFileBrowser(fileDetails: FileDetail): void {
        if (fileDetails.localPath) {
            if (!existsSync(fileDetails.localPath)) {
                throw new FileNotFoundError(
                    `Cannot open "${fileDetails.localPath}". Is the path accessible?`
                );
            }
            shell.showItemInFolder(fileDetails.localPath);
        }
    }
}
