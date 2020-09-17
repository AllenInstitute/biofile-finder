import { MenuItemConstructorOptions } from "electron";

import PersistentConfigServiceElectron from "../../services/PersistentConfigServiceElectron";

const settingsMenu: MenuItemConstructorOptions = {
    label: "Settings",
    submenu: [
        {
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        PersistentConfigServiceElectron.SET_ALLEN_MOUNT_POINT
                    );
                }
            },
            label: "Set Allen Mount Point",
        },
    ],
};

export default settingsMenu;
