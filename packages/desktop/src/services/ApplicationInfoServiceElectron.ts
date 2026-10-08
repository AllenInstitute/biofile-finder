import * as https from "https";
import * as os from "os";
import gt from "semver/functions/gt";

import { ApplicationInfoService } from "../../../core/services";

export default class ApplicationInfoServiceElectron implements ApplicationInfoService {
    public static GET_APP_VERSION_IPC_CHANNEL = "get-app-version";
    public static LATEST_GITHUB_RELEASE_URL =
        "https://api.github.com/repos/AllenInstitute/biofile-finder/releases/latest";

    public async updateAvailable(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            https
                .get(
                    ApplicationInfoServiceElectron.LATEST_GITHUB_RELEASE_URL,
                    {
                        headers: {
                            Accept: "application/vnd.github.v3+json",
                            "User-Agent": "biofile-finder",
                        },
                    },
                    (res) => {
                        let rawData = "";
                        res.on("data", (chunk) => {
                            rawData += chunk;
                        });
                        res.on("end", () => {
                            if (
                                (res.statusCode && res.statusCode >= 400) ||
                                rawData.trim() === undefined
                            ) {
                                reject(
                                    new Error(
                                        `Failed to fetch latest release from Github. Response status text: ${res.statusMessage}`
                                    )
                                );
                                return;
                            }
                            try {
                                let latestReleaseVersion = JSON.parse(rawData).tag_name;
                                // version tags prepend "v" to the version
                                if (latestReleaseVersion.startsWith("v")) {
                                    latestReleaseVersion = latestReleaseVersion.substring(1);
                                }
                                const currentAppVersion = this.getApplicationVersion();
                                const latestIsGreater = gt(latestReleaseVersion, currentAppVersion);
                                console.log(
                                    `Latest release (${latestReleaseVersion})
                                ${latestIsGreater ? "is greater than" : "is not greater than"}
                                current app (${currentAppVersion})`
                                );
                                resolve(latestIsGreater);
                            } catch (e) {
                                reject(
                                    new Error(
                                        `Unable to compare release versions. ${(e as Error).message}`
                                    )
                                );
                                return;
                            }
                        });
                    }
                )
                .on("error", reject);
        });
    }

    public getApplicationVersion() {
        // Must be injected at build-time
        const applicationVersion = process.env.APPLICATION_VERSION;
        if (!applicationVersion) {
            throw new Error("APPLICATION_VERSION must be defined");
        }
        return applicationVersion;
    }

    public getUserName(): string {
        return os.userInfo().username;
    }
}
