import { dialog, ipcMain, ipcRenderer } from "electron";

import { NotificationService } from "../../../core/services";

export default class NotificationServiceElectron implements NotificationService {
    public static SHOW_ERROR_BOX = "show-error-box";
    public static SHOW_MESSAGE_BOX = "show-message-box";

    public static registerIpcHandlers() {
        // Handle displaying an error in the native error box
        ipcMain.handle(NotificationServiceElectron.SHOW_ERROR_BOX, (_, title, content) => {
            return dialog.showErrorBox(title, content);
        });

        // Handle displaying a message in the native error box, returns true if the "Yes" button was chosen
        ipcMain.handle(
            NotificationServiceElectron.SHOW_MESSAGE_BOX,
            async (_, type, title, message) => {
                const { response } = await dialog.showMessageBox({
                    buttons: ["No", "Yes"],
                    cancelId: 0,
                    message,
                    title,
                    type,
                });
                return response === 1;
            }
        );
    }

    public async showMessage(title: string, message: string): Promise<boolean> {
        return await ipcRenderer.invoke(
            NotificationServiceElectron.SHOW_MESSAGE_BOX,
            "info",
            title,
            message
        );
    }

    public async showError(title: string, message: string): Promise<void> {
        return await ipcRenderer.invoke(NotificationServiceElectron.SHOW_ERROR_BOX, title, message);
    }

    public async showQuestion(title: string, message: string): Promise<boolean> {
        return await ipcRenderer.invoke(
            NotificationServiceElectron.SHOW_MESSAGE_BOX,
            "question",
            title,
            message
        );
    }
}
