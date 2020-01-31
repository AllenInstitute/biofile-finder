import { MenuItemConstructorOptions } from "electron";

export enum HttpProtocol {
    HTTP = "http",
    HTTPS = "https", // not currently supported, so no way for user to select
}

export enum FileExplorerServiceHost {
    // This is a special value that is not a host; it is used as a sentinel value in the app to
    // indicate that data should be loaded from flat files pulled into the executable instead of
    // requesting data from the file-explorer-service.
    FLAT_FILE = "flat-file",
    LOCALHOST = "localhost",
    STAGING = "stg-aics-api.corp.alleninstitute.org",
    PRODUCTION = "aics-api.corp.alleninstitute.org",
}

export enum FileExplorerServicePort {
    EIGHTY = 80,
    NINETYEIGHTYONE = 9081, // localhost default in FES repo
}

export interface ConnectionConfig {
    protocol: HttpProtocol;
    host: FileExplorerServiceHost;
    port: FileExplorerServicePort;
}

// Least effort state management accessible to both the main and renderer processes.
global.fileExplorerServiceConnection = {
    protocol: HttpProtocol.HTTP,
    host: FileExplorerServiceHost.FLAT_FILE,
    port: FileExplorerServicePort.EIGHTY,
};

const dataSourceMenu: MenuItemConstructorOptions = {
    label: "Data Source",
    submenu: [
        {
            label: "Host",
            submenu: [
                {
                    label: "Flat files",
                    type: "radio",
                    checked:
                        global.fileExplorerServiceConnection.host ===
                        FileExplorerServiceHost.FLAT_FILE,
                    click: (menuItem, focusedWindow) => {
                        global.fileExplorerServiceConnection.host =
                            FileExplorerServiceHost.FLAT_FILE;
                        focusedWindow.webContents.send("file-explorer-service-connection-change");
                    },
                },
                {
                    label: "Localhost",
                    type: "radio",
                    enabled: false, // TODO: figure out port handling
                    checked:
                        global.fileExplorerServiceConnection.host ===
                        FileExplorerServiceHost.LOCALHOST,
                    click: (menuItem, focusedWindow) => {
                        global.fileExplorerServiceConnection.host =
                            FileExplorerServiceHost.LOCALHOST;
                        focusedWindow.webContents.send("file-explorer-service-connection-change");
                    },
                },
                {
                    label: "Staging",
                    type: "radio",
                    checked:
                        global.fileExplorerServiceConnection.host ===
                        FileExplorerServiceHost.STAGING,
                    click: (menuItem, focusedWindow) => {
                        global.fileExplorerServiceConnection.host = FileExplorerServiceHost.STAGING;
                        focusedWindow.webContents.send("file-explorer-service-connection-change");
                    },
                },
                {
                    label: "Production",
                    type: "radio",
                    checked:
                        global.fileExplorerServiceConnection.host ===
                        FileExplorerServiceHost.PRODUCTION,
                    click: (menuItem, focusedWindow) => {
                        global.fileExplorerServiceConnection.host =
                            FileExplorerServiceHost.PRODUCTION;
                        focusedWindow.webContents.send("file-explorer-service-connection-change");
                    },
                },
            ],
        },
        {
            label: "Port",
            submenu: [
                {
                    label: "80",
                    type: "radio",
                    checked:
                        global.fileExplorerServiceConnection.port ===
                        FileExplorerServicePort.EIGHTY,
                    click: (menuItem, focusedWindow) => {
                        global.fileExplorerServiceConnection.port = FileExplorerServicePort.EIGHTY;
                        focusedWindow.webContents.send("file-explorer-service-connection-change");
                    },
                },
                {
                    label: "9081",
                    type: "radio",
                    checked:
                        global.fileExplorerServiceConnection.port ===
                        FileExplorerServicePort.NINETYEIGHTYONE,
                    click: (menuItem, focusedWindow) => {
                        global.fileExplorerServiceConnection.port =
                            FileExplorerServicePort.NINETYEIGHTYONE;
                        focusedWindow.webContents.send("file-explorer-service-connection-change");
                    },
                },
            ],
        },
    ],
};

export default dataSourceMenu;
