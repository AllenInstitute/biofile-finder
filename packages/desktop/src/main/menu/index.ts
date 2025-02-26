import { MenuItemConstructorOptions } from "electron";

import { getDataSourceMenu } from "./data-source";

function getMenuTemplate(): MenuItemConstructorOptions[] {
    const template: MenuItemConstructorOptions[] = [];

    // Stock Electron menu items
    const defaultMenuItems: MenuItemConstructorOptions[] = [
        { role: "fileMenu" },
        {
            label: "Edit",
            submenu: [{ role: "copy" }, { role: "cut" }, { role: "paste" }, { role: "selectAll" }],
        },
        { role: "viewMenu" },
        { role: "windowMenu" },
    ];

    // If on MacOS, show the "app menu" (only works on MacOS)
    if (process.platform === "darwin") {
        template.unshift({ role: "appMenu", label: "BioFile Finder" });
    }
    return [...template, ...defaultMenuItems, getDataSourceMenu()];
}

export default getMenuTemplate;
