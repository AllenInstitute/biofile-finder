import { MenuItemConstructorOptions } from "electron";
import ExecutionEnvServiceElectron from "../../services/ExecutionEnvServiceElectron";

const settingsMenu: MenuItemConstructorOptions = {
    label: "Settings",
    submenu: [
        {
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        ExecutionEnvServiceElectron.PROMPT_ALLEN_MOUNT_POINT
                    );
                }
            },
            label: "Set Allen Drive Mount Point",
        },
    ],
};

export default settingsMenu;
