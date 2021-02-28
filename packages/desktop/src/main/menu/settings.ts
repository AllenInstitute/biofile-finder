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
        {
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        ExecutionEnvServiceElectron.PROMPT_IMAGE_J_LOCATION
                    );
                }
            },
            label: "Set ImageJ/Fiji Executable Location",
        },
    ],
};

export default settingsMenu;
