import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";

import { app, dialog, FileFilter, ipcMain, IpcMainInvokeEvent, ipcRenderer } from "electron";

import { FileDownloadService, FileDownloadCancellationToken } from "../../../core/services";

// Maps active request ids (uuids) to request download info
interface ActiveRequestMap {
    [id: string]: {
        filePath: string;
        request: http.ClientRequest;
    };
}

interface ShowSaveDialogParams {
    title: string;
    defaultFileName: string;
    buttonLabel: string;
    filters?: FileFilter[];
}

export default class FileDownloadServiceElectron implements FileDownloadService {
    public static GET_FILE_SAVE_PATH = "get-file-save-path";
    private activeRequestMap: ActiveRequestMap = {};

    public static registerIpcHandlers() {
        async function handler(_: IpcMainInvokeEvent, params: ShowSaveDialogParams) {
            return await dialog.showSaveDialog({
                title: params.title,
                defaultPath: path.resolve(app.getPath("downloads"), params.defaultFileName),
                buttonLabel: params.buttonLabel,
                filters: params.filters || [],
            });
        }
        ipcMain.handle(FileDownloadServiceElectron.GET_FILE_SAVE_PATH, handler);
    }

    public async downloadCsvManifest(url: string, postData: string, id: string): Promise<string> {
        const saveDialogParams = {
            title: "Save CSV manifest",
            defaultFileName: "fms-explorer-selections.csv",
            buttonLabel: "Save manifest",
            filters: [{ name: "CSV files", extensions: ["csv"] }],
        };
        const result = await ipcRenderer.invoke(
            FileDownloadServiceElectron.GET_FILE_SAVE_PATH,
            saveDialogParams
        );

        if (result.canceled) {
            return Promise.resolve(FileDownloadCancellationToken);
        }

        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
            },
        };

        // On Windows (at least) you have to self-append the file extension when overwriting the name
        // I imagine this is not something a lot of people think to do (and is kind of inconvenient)
        // - Sean M 08/20/20
        const filePath = result.filePath.endsWith(".csv")
            ? result.filePath
            : result.filePath + ".csv";

        return this.download(id, url, filePath, requestOptions, postData);
    }

    private async download(
        id: string,
        url: string,
        outFilePath: string,
        requestOptions: http.RequestOptions | https.RequestOptions,
        postData?: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            // HTTP requests are made when pointed at localhost, HTTPS otherwise. If that ever changes,
            // this logic can be safely removed.
            const requestor = new URL(url).protocol === "http:" ? http : https;

            const req = requestor.request(url, requestOptions, (res) => {
                res.setEncoding("utf-8");

                if (res.statusCode !== undefined && res.statusCode >= 400) {
                    const errorChunks: string[] = [];
                    res.on("data", (chunk: string) => {
                        errorChunks.push(chunk);
                    });
                    res.on("end", () => {
                        delete this.activeRequestMap[id];
                        const error = errorChunks.join("");
                        const message = `Failed to download file. Error details: ${error}`;
                        reject(message);
                    });
                } else {
                    res.on("end", () => {
                        // If the stream was stopped due to the socket being destroyed
                        // resolve to a sentinal value the client can interpret
                        if (res.aborted) {
                            resolve(FileDownloadCancellationToken);
                        } else {
                            delete this.activeRequestMap[id];
                            resolve(`Successfully downloaded ${outFilePath}`);
                        }
                    });
                    res.on("error", (err) => {
                        delete this.activeRequestMap[id];
                        reject(err.message);
                    });

                    const writeStream = fs.createWriteStream(outFilePath);
                    res.pipe(writeStream);
                }
            });
            req.on("error", (err) => {
                delete this.activeRequestMap[id];
                // If the socket was too prematurely hung up it will emit this error
                if (err.message === FileDownloadCancellationToken) {
                    resolve(FileDownloadCancellationToken);
                } else {
                    reject(`Failed to download file. Error details: ${err}`);
                }
            });
            this.activeRequestMap[id] = { filePath: outFilePath, request: req };
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    public async cancelActiveRequest(id: string): Promise<void> {
        if (!this.activeRequestMap.hasOwnProperty(id)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const { filePath, request } = this.activeRequestMap[id];
            request.destroy(new Error(FileDownloadCancellationToken));
            delete this.activeRequestMap[id];
            // If an artifact has been created, we want to delete any remnants of it
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (!err) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            resolve();
                        } else {
                            reject();
                        }
                    });
                } else {
                    resolve(); // File does not exist
                }
            });
        });
    }
}
