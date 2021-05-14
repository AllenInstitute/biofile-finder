import { DownloadItem, Session } from "electron";

interface ElectronDownloadConfig {
    filePath: string;
    onProgress: (bytesTransferred: number) => void;
    uid: string;
}

export enum ElectronDownloadResolution {
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    INTERRUPTED = "INTERRUPTED",
}

/**
 * Simplified abstraction for working with Electron's built-in file download capabilities.
 */
export default class ElectronDownloader {
    private state: Map<string, DownloadItem>;

    constructor() {
        this.state = new Map();
    }

    public download(
        session: Session,
        url: string,
        config: ElectronDownloadConfig
    ): Promise<ElectronDownloadResolution> {
        return new Promise((resolve, reject) => {
            const onWillDownload = async (_event: Electron.Event, item: DownloadItem) => {
                this.state.set(config.uid, item);
                try {
                    const resolution = await this.onWillDownload(item, config);
                    resolve(resolution);
                } catch (reason) {
                    reject(reason);
                }
            };
            session.once("will-download", onWillDownload);

            session.downloadURL(url);
        });
    }

    public cancelDownload(uid: string) {
        const downloadItem = this.state.get(uid);
        if (!downloadItem) {
            throw new Error(`Record of download for ${uid} missing. Cancel before start?`);
        }

        downloadItem.cancel();
    }

    private onWillDownload(
        item: DownloadItem,
        config: ElectronDownloadConfig
    ): Promise<ElectronDownloadResolution> {
        return new Promise((resolve, reject) => {
            const { filePath, onProgress, uid } = config;

            item.setSavePath(filePath);

            let prevReceivedBytes = 0;
            item.on("updated", (_event: Electron.Event, state: "progressing" | "interrupted") => {
                if (state !== "progressing") {
                    reject(ElectronDownloadResolution.INTERRUPTED);
                    return;
                }

                const receivedBytes = item.getReceivedBytes();
                const progress = receivedBytes - prevReceivedBytes;
                prevReceivedBytes = receivedBytes;
                onProgress(progress);
            });

            item.on(
                "done",
                (_event: Electron.Event, state: "completed" | "cancelled" | "interrupted") => {
                    this.state.delete(uid);

                    if (state === "completed") {
                        resolve(ElectronDownloadResolution.COMPLETED);
                    } else if (state === "cancelled") {
                        resolve(ElectronDownloadResolution.CANCELLED);
                    } else if (state === "interrupted") {
                        reject(ElectronDownloadResolution.INTERRUPTED);
                    }
                }
            );
        });
    }
}
