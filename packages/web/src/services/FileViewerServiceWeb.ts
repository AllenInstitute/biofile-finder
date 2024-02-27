import { FileViewerService } from "../../../core/services";
import NotificationServiceWeb from "./NotificationServiceWeb";

export default class FileViewerServiceElectron implements FileViewerService {
    private notificationService: NotificationServiceWeb;

    public constructor(notificationService: NotificationServiceWeb) {
        this.notificationService = notificationService;
    }

    public async open(executable: string, filePaths: string[]): Promise<void> {
        const reportErrorToUser = async (error: unknown) => {
            await this.notificationService.showError(
                `Opening executable ${executable}`,
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`
            );
        };

        try {
            // TODO
        } catch (error) {
            await reportErrorToUser(error);
        }
    }
}
