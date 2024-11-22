import { MenuItemConstructorOptions } from "electron";

import { GlobalVariableChannels, Environment } from "../../util/constants";

// Least effort state management accessible to both the main and renderer processes.
global.environment = Environment.PRODUCTION;

const dataSourceMenu: MenuItemConstructorOptions = {
    label: "Data Source",
    submenu: [
        {
            label: "Localhost",
            type: "radio",
            checked: global.environment === Environment.LOCALHOST,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    global.environment = Environment.LOCALHOST;
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        environment: Environment.LOCALHOST,
                    });
                }
            },
        },
        {
            label: "Staging",
            type: "radio",
            checked: global.environment === Environment.STAGING,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    global.environment = Environment.STAGING;
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        environment: Environment.STAGING,
                    });
                }
            },
        },
        {
            label: "Production",
            type: "radio",
            checked: global.environment === Environment.PRODUCTION,
            click: (_, focusedWindow) => {
                if (focusedWindow) {
                    global.environment = Environment.PRODUCTION;
                    focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                        environment: Environment.PRODUCTION,
                    });
                }
            },
        },
    ],
};

export default dataSourceMenu;
