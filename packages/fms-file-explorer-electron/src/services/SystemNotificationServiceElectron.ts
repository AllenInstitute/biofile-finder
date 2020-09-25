import { dialog, ipcMain, ipcRenderer } from "electron";

import { SystemNotificationService } from "@aics/fms-file-explorer-core";

export default class SystemNotificationServiceElectron implements SystemNotificationService {
    public static SHOW_ERROR_MESSAGE = "show-error-message";

    public static registerIpcHandlers() {
        ipcMain.handle(SystemNotificationServiceElectron.SHOW_ERROR_MESSAGE, (_, title, content) => {
            return dialog.showErrorBox(title, content);
        });
    }

    public async showErrorMessage(title: string, content: string) {
        await ipcRenderer.invoke(SystemNotificationServiceElectron.SHOW_ERROR_MESSAGE, title, content);
    }
}
