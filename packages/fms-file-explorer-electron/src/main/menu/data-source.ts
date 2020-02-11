import { MenuItemConstructorOptions } from "electron";

export enum FileExplorerServiceBaseUrl {
    // This is a special value that is not a host; it is used as a sentinel value in the app to
    // indicate that data should be loaded from flat files pulled into the executable instead of
    // requesting data from the file-explorer-service.
    FLAT_FILE = "flat-file",

    // localhost default in FES repo
    LOCALHOST = "http://localhost:9082", // HTTP proxy; see scripts/run-http-proxy.sh
    STAGING = "http://stg-aics-api.corp.alleninstitute.org",
    PRODUCTION = "http://aics-api.corp.alleninstitute.org",
}

// Least effort state management accessible to both the main and renderer processes.
// For now (until we're reliable deploying out to prod) default to staging
global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.STAGING;

const dataSourceMenu: MenuItemConstructorOptions = {
    label: "Data Source",
    submenu: [
        {
            label: "Flat files",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.FLAT_FILE,
            enabled: false, // GM 2/10/2020: does not implement hierarchy endpoints
            click: (menuItem, focusedWindow) => {
                global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.FLAT_FILE;
                focusedWindow.webContents.send("file-explorer-service-connection-change");
            },
        },
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
