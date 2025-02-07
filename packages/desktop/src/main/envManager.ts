import { Menu } from "electron";
import getMenuTemplate from "./menu";
import Store from "electron-store";
import { Environment } from "../util/constants";

const store = new Store();

/**
 * Loads the persisted environment from storage.
 * Defaults to Production if no value exists.
 */
export function loadEnvironment(): Environment {
    const env = (store.get("environment") as Environment) || Environment.PRODUCTION;
    store.set("environment", env);
    global.environment = env;
    return env;
}

/**
 * Updates the environment:
 * - Saves newEnv to persistent storage,
 * - Updates global.environment,
 * - Rebuilds the application menu.
 */
export function updateEnvironment(newEnv: Environment): void {
    store.set("environment", newEnv);
    global.environment = newEnv;
    const newMenu = Menu.buildFromTemplate(getMenuTemplate());
    Menu.setApplicationMenu(newMenu);
}
