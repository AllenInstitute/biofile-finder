import * as path from "path";
import { app, BrowserWindow, dialog, Menu } from "electron";

import getMenuTemplate from "./menu";
import ExecutionEnvServicElectron from "../services/ExecutionEnvServiceElectron";
import FileDownloadServiceElectron from "../services/FileDownloadServiceElectron";
import NotificationServiceElectron from "../services/NotificationServiceElectron";
import PersistentConfigServiceElectron from "../services/PersistentConfigServiceElectron";
import { Environment } from "../util/constants";
import { PersistedConfigKeys } from "../../../core/services";

const isDevelopment = process.env.NODE_ENV === "development";

const persistentConfigService = new PersistentConfigServiceElectron();
const newEnvironment =
    persistentConfigService.get(PersistedConfigKeys.Environment) || Environment.PRODUCTION;
persistentConfigService.persist(PersistedConfigKeys.Environment, newEnvironment);

// Build and set the initial menu.
const menu = Menu.buildFromTemplate(getMenuTemplate());
Menu.setApplicationMenu(menu);

// Note: Must match `build.appId` in package.json
app.setAppUserModelId("org.aics.alleninstitute.fileexplorer");

// Prevent window from being garbage collected
let mainWindow: BrowserWindow | undefined;

// Track if a reload attempt has already been made
let hasReloaded = false;

// register handlers called via ipc between renderer and main
const registerIpcHandlers = () => {
    ExecutionEnvServicElectron.registerIpcHandlers();
    FileDownloadServiceElectron.registerIpcHandlers();
    NotificationServiceElectron.registerIpcHandlers();
};

const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        height: 1000,
        show: false,
        webPreferences: {
            // Presumably defaults to false, but without setting, app fails to load with a reference error
            // that "require" is undefined
            contextIsolation: false,

            // NodeJS globals like "module", "exports", and "require" will be injected into the DOM to allow for using NodeJS and Electron APIs.
            // This would only be a problem if libraries or our own code attempted to define the same symbols.
            nodeIntegration: true,
        },
        width: 1200,
    });

    // Listen for renderer crashes and attempt a single reload
    mainWindow.webContents.on("render-process-gone", (event, killed) => {
        console.error("Renderer process crashed. Killed:", killed);

        if (!hasReloaded) {
            hasReloaded = true;
            console.log("Reloading renderer...");
            if (mainWindow) {
                mainWindow.reload();
            }
        } else {
            console.warn("Renderer crashed again.");
        }
    });

    mainWindow.webContents.on("did-finish-load", () => {
        hasReloaded = false;
    });

    mainWindow.once("ready-to-show", () => {
        if (mainWindow) {
            mainWindow.show();
        }
    });

    mainWindow.on("closed", () => {
        // Dereference the window
        mainWindow = undefined;
    });

    // Customize window.open or target="_blank" calls that create new Electron windows
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Creating a new BrowserWindow allows us to set event handlers on child windows
        const childWindow = new BrowserWindow({ parent: mainWindow });
        childWindow.loadURL(url);
        // Catch 'beforeunload' events from web page since Electron handles these differently from browser
        childWindow.webContents.on("will-prevent-unload", (ev: Event) => {
            const options = {
                type: "question",
                buttons: ["Leave", "Cancel"],
                message: "Leave site?",
                detail: "Changes you made may not be saved.",
            };
            const shouldLeave = dialog.showMessageBoxSync(childWindow, options) === 0;
            if (shouldLeave) {
                ev.preventDefault();
                childWindow.destroy();
            }
        });
        // Prevent default behavior, avoid duplicate windows
        return { action: "deny" };
    });

    if (isDevelopment) {
        mainWindow
            .loadURL(`http://localhost:${process.env.WEBPACK_DEV_SERVER_PORT}`)
            .catch((error: Error) => {
                console.error("Failed to load from webpack-dev-server", error);
            });
    } else {
        mainWindow.loadFile(path.join("dist", "renderer", "index.html")).catch((error: Error) => {
            console.error("Failed to load from file", error);
        });
    }
};

const init = () => {
    require("./init-electron-store");
    registerIpcHandlers();
    createMainWindow();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", init);

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
    app.quit();
}

app.on("second-instance", () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
    }
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        init();
    }
});
