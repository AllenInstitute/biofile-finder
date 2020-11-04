import { MenuItemConstructorOptions } from "electron";

export enum FileExplorerServiceBaseUrl {
    LOCALHOST = "http://localhost:9081",
    STAGING = "http://stg-aics-api.corp.alleninstitute.org",
    PRODUCTION = "http://aics-api.corp.alleninstitute.org",
}

// Least effort state management accessible to both the main and renderer processes.
global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION;

const dataSourceMenu: MenuItemConstructorOptions = {
    label: "Data Source",
    submenu: [
        {
            label: "Localhost",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.LOCALHOST,
            click: (menuItem, focusedWindow) => {
                global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.LOCALHOST;
                if (focusedWindow) {
                    focusedWindow.webContents.send("file-explorer-service-connection-config");
                }
            },
        },
        {
            label: "Staging",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.STAGING,
            click: (menuItem, focusedWindow) => {
                global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.STAGING;
                if (focusedWindow) {
                    focusedWindow.webContents.send("file-explorer-service-connection-config");
                }
            },
        },
        {
            label: "Production",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.PRODUCTION,
            click: (menuItem, focusedWindow) => {
                global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION;
                if (focusedWindow) {
                    focusedWindow.webContents.send("file-explorer-service-connection-config");
                }
            },
        },
    ],
};

export default dataSourceMenu;
