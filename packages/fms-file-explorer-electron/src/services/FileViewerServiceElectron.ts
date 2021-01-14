import { FileViewerService } from "@aics/fms-file-explorer-core";

import NotificationServiceElectron from "./NotificationServiceElectron";
import defaultViewerStrategy from "./file-viewer-strategy/defaultViewerStrategy";
import fijiViewerStrategy from "./file-viewer-strategy/fijiViewerStrategy";
import ViewerStrategy from "./file-viewer-strategy/ViewerStrategy";

export default class FileViewerServiceElectron implements FileViewerService {
    private notificationService: NotificationServiceElectron;

    public constructor(notificationService: NotificationServiceElectron) {
        this.notificationService = notificationService;
    }

    public async open(executable: string, filePaths: string[]): Promise<void> {
        const reportErrorToUser = async (error: string) => {
            await this.notificationService.showError(
                `Opening executable ${executable}`,
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`
            );
        };

        // N.b.: this is a purposeful kludge of the strategy pattern: instead of keeping the context (this class)
        // unaware of concrete strategies, encode some heuristics about which concrete strategy to use.
        // This simplifies the usage of this class; at runtime, the explorer-core package can continue to
        // remain ignorant of the low-level details required to programmatically use any particular executable,
        // and opens the possibility for removing the need for the explorer-core to know anything at all about
        // the executable chosen.
        let viewerStrategy: ViewerStrategy = defaultViewerStrategy;
        if (executable.includes("Fiji") || RegExp("ImageJ-.*$").test(executable)) {
            viewerStrategy = fijiViewerStrategy;
        }

        try {
            await viewerStrategy(executable, filePaths);
        } catch (error) {
            await reportErrorToUser(error);
        }
    }
}
