import { uniqueId } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import Instructions, { OS } from "./Instructions";
import { PrimaryButton } from "../../../../core/components/Buttons";
import { interaction } from "../../../../core/state";

import styles from "./Download.module.css";

const REPO = "biofile-finder";
const REPO_OWNER = "AllenInstitute";

const FILE_TYPE_BY_OS = {
    [OS.WINDOWS]: "exe",
    [OS.MAC]: "dmg",
    [OS.LINUX]: "AppImage",
};

interface Asset {
    browser_download_url: string;
    name: string;
}

interface Release {
    assets: Asset[];
    created_at: string;
    prerelease: boolean;
}

// Determine OS from navigator object
const getOs = (): OS | undefined => {
    if (navigator.appVersion.indexOf("Win") !== -1) {
        return OS.WINDOWS;
    }
    if (navigator.appVersion.indexOf("Mac") !== -1) {
        return OS.MAC;
    }
    if (navigator.appVersion.indexOf("Linux") !== -1) {
        return OS.LINUX;
    }
};

// Grab the latest release from the GitHub API
const getLatestRelease = async (): Promise<Release> => {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO}/releases`);
    if (!response.ok) {
        throw Error(response.statusText);
    }
    const releases: Release[] = await response.json();
    const sortedReleases = releases
        .filter((release) => !release.prerelease)
        .sort((a, b) => b["created_at"].localeCompare(a["created_at"]));
    if (sortedReleases.length === 0) {
        throw new Error(`No releases found in GitHub ${REPO_OWNER}/${REPO}`);
    }
    return sortedReleases[0];
};

const getAssetDownloadURL = async (os: OS): Promise<string> => {
    const release = await getLatestRelease();

    // Find the download link for the appropriate OS
    const assets = release?.assets.filter((asset) => asset.name.endsWith(FILE_TYPE_BY_OS[os]));
    if (!assets?.length) {
        throw new Error("Could not find asset for os in latest releases");
    }
    return assets[0]["browser_download_url"];
};

/**
 * Internal facing page for downloading desktop version of BFF.
 */
export default function Download() {
    const [error, setError] = React.useState<string>();
    const { fileDownloadService } = useSelector(interaction.selectors.getPlatformDependentServices);
    const isAicsEmployee = useSelector(interaction.selectors.isAicsEmployee);

    // Only show download button if user is an AICS employee
    // should ever get here, but just in case
    if (!isAicsEmployee) {
        return <p>Unauthorized, BioFile Finder is not available for public download yet.</p>;
    }

    const os = getOs();
    const onDownload = async () => {
        if (!os) return;

        try {
            const downloadURL = await getAssetDownloadURL(os);
            await fileDownloadService.download(
                { id: uniqueId(), name: "BioFile Finder", path: downloadURL, data: downloadURL },
                uniqueId()
            );
            setError(undefined);
        } catch (error) {
            setError((error as Error).message);
        }
    };

    return (
        <div className={styles.root}>
            {error && (
                <div className={styles.section}>
                    <div className={styles.error}>The following error occurred: {error}</div>
                </div>
            )}
            <div className={styles.section}>
                <div className={styles.downloadContainer}>
                    <PrimaryButton
                        className={styles.downloadButton}
                        iconName="Download"
                        title="Download"
                        text="Download Latest Version"
                        disabled={!os}
                        onClick={onDownload}
                    />
                </div>
            </div>
            <div className={styles.section}>
                <h2 className={styles.header}>Installation Instructions</h2>
                <p>To install the BioFile Finder, follow the OS specific instructions below.</p>
                <Instructions os={os} />
            </div>
        </div>
    );
}
