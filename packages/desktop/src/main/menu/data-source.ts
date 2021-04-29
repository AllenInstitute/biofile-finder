import { MenuItemConstructorOptions } from "electron";

import {
    GlobalVariableChannels,
    FileDownloadServiceBaseUrl,
    FileExplorerServiceBaseUrl,
} from "../../util/constants";

// Least effort state management accessible to both the main and renderer processes.
global.fileDownloadServiceBaseUrl = FileDownloadServiceBaseUrl.PRODUCTION;
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
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        fileExplorerServiceBaseUrl: FileExplorerServiceBaseUrl.LOCALHOST,
                        fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl.LOCALHOST,
                    });
                }
            },
        },
        {
            label: "Staging",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.STAGING,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        fileExplorerServiceBaseUrl: FileExplorerServiceBaseUrl.STAGING,
                        fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl.STAGING,
                    });
                }
            },
        },
        {
            label: "Production",
            type: "radio",
            checked: global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.PRODUCTION,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        fileExplorerServiceBaseUrl: FileExplorerServiceBaseUrl.PRODUCTION,
                        fileDownloadServiceBaseUrl: FileDownloadServiceBaseUrl.PRODUCTION,
                    });
                }
            },
        },
    ],
};

export default dataSourceMenu;
