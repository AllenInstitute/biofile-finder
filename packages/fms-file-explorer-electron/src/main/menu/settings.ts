import { MenuItemConstructorOptions } from "electron";

import FileViewerServiceElectron from "../../services/FileViewerServiceElectron";

const settingsMenu: MenuItemConstructorOptions = {
    label: "Settings",
    submenu: [
        {
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(FileViewerServiceElectron.SET_ALLEN_MOUNT_POINT);
                }
            },
            label: "Set Allen Drive Mount Point",
        },
        {
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(FileViewerServiceElectron.SET_IMAGE_J_LOCATION);
                }
            },
            label: "Set ImageJ/Fiji Executable Location",
        },
    ],
};

export default settingsMenu;
