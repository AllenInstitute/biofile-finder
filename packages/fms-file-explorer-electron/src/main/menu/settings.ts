import { MenuItemConstructorOptions } from "electron";
import ExecutableEnvServiceElectron from "../../services/ExecutableEnvElectron";

const settingsMenu: MenuItemConstructorOptions = {
    label: "Settings",
    submenu: [
        {
            click: async (_, focusedWindow) => {
                if (focusedWindow) {
                    const allenPath = await focusedWindow.webContents.send(
                        ExecutableEnvServiceElectron.PROMPT_ALLEN_MOUNT_POINT
                    );
                    global.fileExplorerServiceAllenMountPoint = allenPath;
                    focusedWindow.webContents.send("file-explorer-service-global-variable-change");
                }
            },
            label: "Set Allen Drive Mount Point",
        },
        {
            click: async (_, focusedWindow) => {
                if (focusedWindow) {
                    const imageJExecutable = await focusedWindow.webContents.send(
                        ExecutableEnvServiceElectron.PROMPT_IMAGE_J_LOCATION
                    );
                    global.fileExplorerServiceImageJExecutable = imageJExecutable;
                    focusedWindow.webContents.send("file-explorer-service-global-variable-change");
                }
            },
            label: "Set ImageJ/Fiji Executable Location",
        },
    ],
};

export default settingsMenu;
