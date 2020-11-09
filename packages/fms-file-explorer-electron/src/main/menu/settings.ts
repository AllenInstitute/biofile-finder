import { MenuItemConstructorOptions } from "electron";
import ExecutableEnvServiceElectron from "../../services/ExecutableEnvServiceElectron";

const settingsMenu: MenuItemConstructorOptions = {
    label: "Settings",
    submenu: [
        {
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        ExecutableEnvServiceElectron.PROMPT_ALLEN_MOUNT_POINT
                    );
                }
            },
            label: "Set Allen Drive Mount Point",
        },
        {
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        ExecutableEnvServiceElectron.PROMPT_IMAGE_J_LOCATION
                    );
                }
            },
            label: "Set ImageJ/Fiji Executable Location",
        },
    ],
};

export default settingsMenu;
