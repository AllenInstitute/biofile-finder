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
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        "file-explorer-service-connection-config",
                        FileExplorerServiceBaseUrl.LOCALHOST
                    );
                }
            },
        },
        {
            label: "Staging",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.STAGING,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        "file-explorer-service-connection-config",
                        FileExplorerServiceBaseUrl.STAGING
                    );
                }
            },
        },
        {
            label: "Production",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.PRODUCTION,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(
                        "file-explorer-service-connection-config",
                        FileExplorerServiceBaseUrl.PRODUCTION
                    );
                }
            },
        },
    ],
};

export default dataSourceMenu;
