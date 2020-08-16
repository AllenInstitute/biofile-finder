import { ApplicationInfoService } from "@aics/fms-file-explorer-core";
import { app, ipcMain, ipcRenderer } from "electron";
import gt from "semver/functions/gt";

export default class ApplicationInfoServiceElectron implements ApplicationInfoService {
    public static GET_APP_VERSION_IPC_CHANNEL = "get-app-version";

    public static registerIpcHandlers() {
        ipcMain.handle(ApplicationInfoServiceElectron.GET_APP_VERSION_IPC_CHANNEL, () => {
            return app.getVersion();
        });
    }

    public async updateAvailable(): Promise<boolean> {
        const url =
            "https://api.github.com/repos/AllenInstitute/aics-fms-file-explorer-app/releases/latest";
        const response = await fetch(url, {
            headers: {
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!response.ok || response.status >= 400) {
            throw new Error(
                `Failed to fetch latest release from Github. Response status text: ${response.statusText}`
            );
        }

        const latestRelease = await response.json();
        let latestReleaseVersion = latestRelease.tag_name;
        // version tags prepend "v" to the version
        if (latestReleaseVersion.startsWith("v")) {
            latestReleaseVersion = latestReleaseVersion.substring(1);
        }

        const currentAppVersion = await ipcRenderer.invoke(
            ApplicationInfoServiceElectron.GET_APP_VERSION_IPC_CHANNEL
        );
        const latestIsGreater = gt(latestReleaseVersion, currentAppVersion);
        console.log(
            `Latest release (${latestReleaseVersion}) ${
                latestIsGreater ? "is greater than" : "is not greater than"
            } current app (${currentAppVersion})`
        );
        return latestIsGreater;
    }
}
