import * as http from "http";
import * as fs from "fs";
import * as path from "path";

import { app, dialog, ipcMain, ipcRenderer } from "electron";

import { CancellationToken, FileDownloadService } from "@aics/fms-file-explorer-core";

export default class FileDownloadServiceElectron implements FileDownloadService {
    public static GET_FILE_SAVE_PATH = "get-file-save-path";

    public static registerIpcHandlers() {
        ipcMain.handle(FileDownloadServiceElectron.GET_FILE_SAVE_PATH, async () => {
            return await dialog.showSaveDialog({
                title: "Save CSV manifest",
                defaultPath: path.resolve(app.getPath("downloads"), "fms-explorer-selections.csv"),
            });
        });
    }

    public async downloadCsvManifest(
        url: string,
        postData: string,
        totalCountSelected: number
    ): Promise<string> {
        const result = await ipcRenderer.invoke(FileDownloadServiceElectron.GET_FILE_SAVE_PATH);

        if (result.canceled) {
            return Promise.resolve(CancellationToken);
        }

        return new Promise((resolve, reject) => {
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
                            const error = errorChunks.join("");
                            const message = `Failed to download CSV manifest. Error details: ${error}`;
                            reject(message);
                        });
                    } else {
                        res.on("end", () => {
                            resolve(
                                `CSV manifest for ${totalCountSelected} file(s) saved to ${result.filePath}`
                            );
                        });
                        res.on("error", (err) => {
                            reject(err.message);
                        });

                        const writeStream = fs.createWriteStream(result.filePath as string);
                        res.pipe(writeStream);
                    }
                }
            );
            req.write(postData);
            req.end();
        });
    }
}
