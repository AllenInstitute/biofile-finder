import * as path from "path";

import { app, BrowserWindow } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";

const isDevelopment = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | undefined;

const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        height: 1000,
        webPreferences: {
            // NodeJS globals like "module", "exports", and "require" will be injected into the DOM to allow for using NodeJS and Electron APIs.
            // This would only be a problem if libraries or our own code attempted to define the same symbols.
            nodeIntegration: true,
        },
        width: 1000,
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
                        console.log("Loaded from webpack-dev-server");

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
            .loadURL(`file://${path.join(__dirname, "renderer", "index.html")}`)
            .then(() => {
                console.log("Loaded from file");
            })
            .catch((error: Error) => {
                console.error("Failed to load from file", error);
            });
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createMainWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createMainWindow();
    }
});
