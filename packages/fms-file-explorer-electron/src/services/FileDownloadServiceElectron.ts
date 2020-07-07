import * as http from "http";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { remote } from "electron";
import { noop } from "lodash";

import { FileDownloadService } from "@aics/fms-file-explorer-core";

export default class FileDownloadServiceElectron implements FileDownloadService {
    public async downloadCsvManifest(
        url: string,
        postData: string,
        totalCountSelected: number,
        onEnd: () => void = noop
    ) {
        const result = await remote.dialog.showSaveDialog(remote.getCurrentWindow(), {
            title: "Save CSV manifest",
            defaultPath: path.resolve(os.homedir(), "fms-explorer-selections.csv"),
        });

        if (result.canceled || !result.filePath) {
            return;
        }

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
                        const message = `Failed to download CSV: ${error}`;
                        throw new Error(message);
                    });
                } else {
                    res.on("end", onEnd);
                    res.on("error", (err) => {
                        throw err;
                    });

                    const writeStream = fs.createWriteStream(result.filePath as string); // ensured defined above
                    res.pipe(writeStream);
                }
            }
        );
        req.write(postData);
        req.end();
    }
}
