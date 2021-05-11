import { DownloadItem, Session } from "electron";

interface ElectronDownloadConfig {
    filePath: string;
    onProgress: (progress: number) => void;
    uid: string;
}

export enum ElectronDownloadResolution {
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    INTERRUPTED = "INTERRUPTED",
}

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
            const onWillDownload = (_event: Electron.Event, item: DownloadItem) => {
                this.state.set(config.uid, item);
                this.onWillDownload(item, config, resolve, reject);
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
        config: ElectronDownloadConfig,
        resolve: (value: ElectronDownloadResolution) => void,
        reject: (value: ElectronDownloadResolution) => void
    ) {
        const { filePath, onProgress, uid } = config;

        item.setSavePath(filePath);

        let progress = 0;
        item.on("updated", (_event: Electron.Event, state) => {
            if (state !== "progressing") {
                return;
            }

            const receivedBytes = item.getReceivedBytes();
            progress = receivedBytes - progress;
            onProgress(progress);
        });

        item.on("done", (_event: Electron.Event, state) => {
            this.state.delete(uid);

            if (state === "completed") {
                resolve(ElectronDownloadResolution.COMPLETED);
            } else if (state === "cancelled") {
                resolve(ElectronDownloadResolution.CANCELLED);
            } else if (state === "interrupted") {
                reject(ElectronDownloadResolution.INTERRUPTED);
            }
        });
    }
}
