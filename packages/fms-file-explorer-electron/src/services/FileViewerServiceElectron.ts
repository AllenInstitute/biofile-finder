import childProcess from "child_process";

import { FileViewerService } from "@aics/fms-file-explorer-core";

import NotificationServiceElectron from "./NotificationServiceElectron";

export default class FileViewerServiceElectron implements FileViewerService {
    private notificationService: NotificationServiceElectron;

    public constructor(notificationService: NotificationServiceElectron) {
        this.notificationService = notificationService;
    }

    public async open(executable: string, filePaths?: string[]): Promise<void> {
        const reportErrorToUser = async (error: string) => {
            await this.notificationService.showError(
                `Opening executable ${executable}`,
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`
            );
        };

        try {
            // Create a child process for the executable to open files in
            const executableProcess = childProcess.spawn(executable, filePaths);
            // Handle unsuccessful startups of the executable (these will only be called if explorer is still open)
            executableProcess.on("error", reportErrorToUser);
            executableProcess.on("exit", async (code: number) => {
                if (code !== 0) {
                    await reportErrorToUser(`Status Code ${code}`);
                }
            });
        } catch (error) {
            await reportErrorToUser(error);
        }
    }
}
