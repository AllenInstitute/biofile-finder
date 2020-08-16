import "regenerator-runtime/runtime";

import * as path from "path";

import { app, BrowserWindow, Menu } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";

import template from "./menu";
import ApplicationInfoServiceElectron from "../services/ApplicationInfoServiceElectron";
import FileDownloadServiceElectron from "../services/FileDownloadServiceElectron";

const isDevelopment = process.env.NODE_ENV === "development";

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// Note: Must match `build.appId` in package.json
app.setAppUserModelId("org.aics.alleninstitute.fileexplorer");

// Prevent window from being garbage collected
let mainWindow: BrowserWindow | undefined;

// register handlers called via ipc between renderer and main
const registerIpcHandlers = () => {
    ApplicationInfoServiceElectron.registerIpcHandlers();
    FileDownloadServiceElectron.registerIpcHandlers();
};

const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        height: 1000,
        webPreferences: {
            // NodeJS globals like "module", "exports", and "require" will be injected into the DOM to allow for using NodeJS and Electron APIs.
            // This would only be a problem if libraries or our own code attempted to define the same symbols.
            nodeIntegration: true,
        },
        width: 1200,
    });

    mainWindow.on("ready-to-show", () => {
        if (mainWindow) {
            mainWindow.show();
        }
    });

    mainWindow.on("closed", () => {
        // Dereference the window
        mainWindow = undefined;
    });

    if (isDevelopment) {
        installExtension(REACT_DEVELOPER_TOOLS)
            .then((name: string) => {
                console.log(`Added extension: ${name}`);

                if (!mainWindow) {
                    throw new Error("mainWindow not defined");
                }

                mainWindow
                    .loadURL(`http://localhost:${process.env.WEBPACK_DEV_SERVER_PORT}`)
                    .then(() => {
                        if (mainWindow) {
                            mainWindow.webContents.openDevTools();
                        }
                    })
                    .catch((error: Error) => {
                        console.error("Failed to load from webpack-dev-server", error);
                    });
            })
            .catch((err: Error) =>
                console.error("An error occurred loading React Dev Tools: ", err)
            );
    } else {
        mainWindow
            .loadURL(`file://${path.join(__dirname, "..", "renderer", "index.html")}`)
            .catch((error: Error) => {
                console.error("Failed to load from file", error);
            });
    }
};

const init = () => {
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
