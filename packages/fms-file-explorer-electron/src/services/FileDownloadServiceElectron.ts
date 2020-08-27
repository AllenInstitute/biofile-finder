import * as http from "http";
import * as fs from "fs";
import * as path from "path";

import { app, dialog, ipcMain, ipcRenderer } from "electron";

import { AbortToken, CancellationToken, FileDownloadService } from "@aics/fms-file-explorer-core";

// Maps active request ids (uuids) to request download info
interface ActiveRequestMap {
    [id: string]: {
        filePath: string;
        request: http.ClientRequest;
    };
}

export default class FileDownloadServiceElectron implements FileDownloadService {
    public static GET_FILE_SAVE_PATH = "get-file-save-path";
    private activeRequestMap: ActiveRequestMap = {};

    public static registerIpcHandlers() {
        ipcMain.handle(FileDownloadServiceElectron.GET_FILE_SAVE_PATH, async () => {
            return await dialog.showSaveDialog({
                title: "Save CSV manifest",
                defaultPath: path.resolve(app.getPath("downloads"), "fms-explorer-selections.csv"),
                buttonLabel: "Save manifest",
                filters: [{ name: "CSV files", extensions: ["csv"] }],
            });
        });
    }

    public async downloadCsvManifest(url: string, postData: string, id: string): Promise<string> {
        const result = await ipcRenderer.invoke(FileDownloadServiceElectron.GET_FILE_SAVE_PATH);

        if (result.canceled) {
            return Promise.resolve(CancellationToken);
        }

        return new Promise((resolve, reject) => {
            // On Windows (at least) you have to self-append the file extension when overwriting the name
            // I imagine this is not something a lot of people think to do (and is kind of inconvenient)
            // - Sean M 08/20/20
            const filePath = result.filePath.endsWith(".csv")
                ? result.filePath
                : result.filePath + ".csv";
            const req = http.request(
                url,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(postData),
                    },
                },
                (res) => {
                    res.setEncoding("utf-8");

                    if (res.statusCode !== undefined && res.statusCode >= 400) {
                        const errorChunks: string[] = [];
                        res.on("data", (chunk: string) => {
                            errorChunks.push(chunk);
                        });
                        res.on("end", () => {
                            delete this.activeRequestMap[id];
                            const error = errorChunks.join("");
                            const message = `Failed to download CSV manifest. Error details: ${error}`;
                            reject(message);
                        });
                    } else {
                        res.on("end", () => {
                            // If the stream was stopped due to the socket being destroyed
                            // resolve to a sentinal value the client can interpret
                            if (res.aborted) {
                                resolve(AbortToken);
                            } else {
                                delete this.activeRequestMap[id];
                                resolve(`CSV manifest saved to ${filePath}`);
                            }
                        });
                        res.on("error", (err) => {
                            delete this.activeRequestMap[id];
                            reject(err.message);
                        });

                        const writeStream = fs.createWriteStream(filePath);
                        res.pipe(writeStream);
                    }
                }
            );
            this.activeRequestMap[id] = { filePath, request: req };
            req.write(postData);
            req.end();
        });
    }

    public async abortActiveRequest(id: string): Promise<boolean> {
        if (!this.activeRequestMap.hasOwnProperty(id)) {
            return Promise.resolve(false);
        }
        return new Promise((resolve, reject) => {
            const { filePath, request } = this.activeRequestMap[id];
            request.destroy();
            delete this.activeRequestMap[id];
            // If an artifact has been created, we want to delete any remnants of it
            fs.exists(filePath, (exists) => {
                if (exists) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            resolve(true);
                        } else {
                            reject(false);
                        }
                    });
                } else {
                    resolve(false);
                }
            });
        });
    }
}
