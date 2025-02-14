import { Menu, MenuItemConstructorOptions } from "electron";

import getMenuTemplate from "../menu";
import { GlobalVariableChannels, Environment } from "../../util/constants";
import PersistentConfigServiceElectron from "../../services/PersistentConfigServiceElectron";
import { PersistedConfigKeys } from "../../../../core/services";

const persistentConfigService = new PersistentConfigServiceElectron();

export function getDataSourceMenu(): MenuItemConstructorOptions {
    return {
        label: "Data Source",
        submenu: [
            {
                label: "Localhost",
                type: "radio",
                checked:
                    persistentConfigService.get(PersistedConfigKeys.Environment) ===
                    Environment.LOCALHOST,
                click: (_, focusedWindow) => {
                    if (focusedWindow) {
                        persistentConfigService.persist(
                            PersistedConfigKeys.Environment,
                            Environment.LOCALHOST
                        );
                        const newMenu = Menu.buildFromTemplate(getMenuTemplate());
                        Menu.setApplicationMenu(newMenu);
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
                checked:
                    persistentConfigService.get(PersistedConfigKeys.Environment) ===
                    Environment.STAGING,
                click: (_, focusedWindow) => {
                    if (focusedWindow) {
                        persistentConfigService.persist(
                            PersistedConfigKeys.Environment,
                            Environment.STAGING
                        );
                        const newMenu = Menu.buildFromTemplate(getMenuTemplate());
                        Menu.setApplicationMenu(newMenu);
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
                checked:
                    persistentConfigService.get(PersistedConfigKeys.Environment) ===
                    Environment.PRODUCTION,
                click: (_, focusedWindow) => {
                    if (focusedWindow) {
                        persistentConfigService.persist(
                            PersistedConfigKeys.Environment,
                            Environment.PRODUCTION
                        );
                        const newMenu = Menu.buildFromTemplate(getMenuTemplate());
                        Menu.setApplicationMenu(newMenu);
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
