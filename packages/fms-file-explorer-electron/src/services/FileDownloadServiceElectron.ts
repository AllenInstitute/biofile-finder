import * as http from "http";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { remote } from "electron";

import { CancellationToken, FileDownloadService } from "@aics/fms-file-explorer-core";

export default class FileDownloadServiceElectron implements FileDownloadService {
    public async downloadCsvManifest(
        url: string,
        postData: string,
        totalCountSelected: number
    ): Promise<string> {
        const result = await remote.dialog.showSaveDialog(remote.getCurrentWindow(), {
            title: "Save CSV manifest",
            defaultPath: path.resolve(os.homedir(), "fms-explorer-selections.csv"),
        });

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
                            const message = `Failed to download CSV manifest. Error details:\n${error}`;
                            reject(message);
                        });
                    } else {
                        res.on("end", () => {
                            resolve(
                                `CSV manifest for ${totalCountSelected} files saved to ${result.filePath}`
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
