import { ApplicationInfoService } from "@aics/fms-file-explorer-core";
import axios from "axios";
const httpAdapter = require("axios/lib/adapters/http"); // exported from lib, but not typed (can't be fixed through typing augmentation)
import { app, ipcMain, ipcRenderer } from "electron";
import gt from "semver/functions/gt";

export default class ApplicationInfoServiceElectron implements ApplicationInfoService {
    public static GET_APP_VERSION_IPC_CHANNEL = "get-app-version";
    public static LATEST_GITHUB_RELEASE_URL =
        "https://api.github.com/repos/AllenInstitute/aics-fms-file-explorer-app/releases/latest";

    public static registerIpcHandlers() {
        ipcMain.handle(ApplicationInfoServiceElectron.GET_APP_VERSION_IPC_CHANNEL, () => {
            return app.getVersion();
        });
    }

    public async updateAvailable(): Promise<boolean> {
        const response = await axios.get(ApplicationInfoServiceElectron.LATEST_GITHUB_RELEASE_URL, {
            // Ensure this runs with the NodeJS http/https client so that testing across code that makes use of Electron/NodeJS APIs
            // can be done with consistent patterns.
            // Requires the Electron renderer process to be run with `nodeIntegration: true`.
            adapter: httpAdapter,
            headers: {
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (response.status >= 400 || response.data === undefined) {
            throw new Error(
                `Failed to fetch latest release from Github. Response status text: ${response.statusText}`
            );
        }

        let latestReleaseVersion = response.data.tag_name;
        // version tags prepend "v" to the version
        if (latestReleaseVersion.startsWith("v")) {
            latestReleaseVersion = latestReleaseVersion.substring(1);
        }

        const currentAppVersion = await this.getApplicationVersion();
        const latestIsGreater = gt(latestReleaseVersion, currentAppVersion);
        console.log(
            `Latest release (${latestReleaseVersion})
            ${latestIsGreater ? "is greater than" : "is not greater than"}
            current app (${currentAppVersion})`
        );
        return latestIsGreater;
    }

    public getApplicationVersion() {
        return ipcRenderer.invoke(ApplicationInfoServiceElectron.GET_APP_VERSION_IPC_CHANNEL);
    }
}
