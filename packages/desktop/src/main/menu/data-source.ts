import { MenuItemConstructorOptions } from "electron";
import { GlobalVariableChannels, Environment } from "../../util/constants";
import { updateEnvironment } from "../envManager";

export function getDataSourceMenu(): MenuItemConstructorOptions {
    return {
        label: "Data Source",
        submenu: [
            {
                label: "Localhost",
                type: "radio",
                checked: global.environment === Environment.LOCALHOST,
                click: (_, focusedWindow) => {
                    if (focusedWindow) {
                        updateEnvironment(Environment.LOCALHOST);
                        focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                            environment: Environment.LOCALHOST,
                        });
                        // Notify the renderer of the change.
                        focusedWindow.webContents.send(
                            "environment-changed",
                            Environment.LOCALHOST
                        );
                    }
                },
            },
            {
                label: "Staging",
                type: "radio",
                checked: global.environment === Environment.STAGING,
                click: (_, focusedWindow) => {
                    if (focusedWindow) {
                        updateEnvironment(Environment.STAGING);
                        focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                            environment: Environment.STAGING,
                        });
                        focusedWindow.webContents.send("environment-changed", Environment.STAGING);
                    }
                },
            },
            {
                label: "Production",
                type: "radio",
                checked: global.environment === Environment.PRODUCTION,
                click: (_, focusedWindow) => {
                    if (focusedWindow) {
                        updateEnvironment(Environment.PRODUCTION);
                        focusedWindow.webContents.send(GlobalVariableChannels.BaseUrl, {
                            environment: Environment.PRODUCTION,
                        });
                        focusedWindow.webContents.send(
                            "environment-changed",
                            Environment.PRODUCTION
                        );
                    }
                },
            },
        ],
    };
}
