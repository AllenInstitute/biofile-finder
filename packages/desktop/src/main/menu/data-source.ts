import { MenuItemConstructorOptions } from "electron";

import {
    GlobalVariableChannels,
    AicsLoadBalancerBaseUrl,
    FileExplorerServiceBaseUrl,
} from "../../util/constants";

// Least effort state management accessible to both the main and renderer processes.
global.aicsLoadBalancerBaseUrl = AicsLoadBalancerBaseUrl.PRODUCTION;
global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION;

const dataSourceMenu: MenuItemConstructorOptions = {
    label: "Data Source",
    submenu: [
        {
            label: "Localhost",
            type: "radio",
            checked:
                global.aicsLoadBalancerBaseUrl === AicsLoadBalancerBaseUrl.LOCALHOST &&
                global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.LOCALHOST,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    global.aicsLoadBalancerBaseUrl = AicsLoadBalancerBaseUrl.LOCALHOST;
                    global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.LOCALHOST;
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        aicsLoadBalancerBaseUrl: AicsLoadBalancerBaseUrl.LOCALHOST,
                        fileExplorerServiceBaseUrl: FileExplorerServiceBaseUrl.LOCALHOST,
                    });
                }
            },
        },
        {
            label: "Staging",
            type: "radio",
            checked:
                global.aicsLoadBalancerBaseUrl === AicsLoadBalancerBaseUrl.STAGING &&
                global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.STAGING,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    global.aicsLoadBalancerBaseUrl = AicsLoadBalancerBaseUrl.STAGING;
                    global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.STAGING;
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        aicsLoadBalancerBaseUrl: AicsLoadBalancerBaseUrl.STAGING,
                        fileExplorerServiceBaseUrl: FileExplorerServiceBaseUrl.STAGING,
                    });
                }
            },
        },
        {
            label: "Production",
            type: "radio",
            checked:
                global.aicsLoadBalancerBaseUrl === AicsLoadBalancerBaseUrl.PRODUCTION &&
                global.fileExplorerServiceBaseUrl === FileExplorerServiceBaseUrl.PRODUCTION,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    global.aicsLoadBalancerBaseUrl = AicsLoadBalancerBaseUrl.PRODUCTION;
                    global.fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION;
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        aicsLoadBalancerBaseUrl: AicsLoadBalancerBaseUrl.PRODUCTION,
                        fileExplorerServiceBaseUrl: FileExplorerServiceBaseUrl.PRODUCTION,
                    });
                }
            },
        },
    ],
};

export default dataSourceMenu;
