import { MenuItemConstructorOptions } from "electron";

export enum FileExplorerServiceBaseUrl {
    LOCALHOST = "http://dev-aics-gmp-001.corp.alleninstitute.org:9081",
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
                focusedWindow.webContents.send("file-explorer-service-connection-change");
            },
        },
        {
            label: "Staging",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.STAGING,
            click: (menuItem, focusedWindow) => {
                global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.STAGING;
                focusedWindow.webContents.send("file-explorer-service-connection-change");
            },
        },
        {
            label: "Production",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.PRODUCTION,
            click: (menuItem, focusedWindow) => {
                global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION;
                focusedWindow.webContents.send("file-explorer-service-connection-change");
            },
        },
    ],
};

export default dataSourceMenu;
