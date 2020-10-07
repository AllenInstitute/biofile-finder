import childProcess from "child_process";

import { ipcRenderer } from "electron";

import PersistentConfigServiceElectron from "./PersistentConfigServiceElectron";

import { FileViewerService } from "@aics/fms-file-explorer-core";

export default class FileViewerServiceElectron implements FileViewerService {

    public async openFilesInImageJ(filePaths: string[], imageJExecutable: string) {
        const reportErrorToUser = async (error: string) => {
            await ipcRenderer.invoke(PersistentConfigServiceElectron.SHOW_ERROR_BOX,
                "Opening file in ImageJ/Fiji",
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`);
        }

        try {
            // Create a child process for ImageJ to open files in
            const imageJProcess = childProcess.spawn(imageJExecutable, filePaths);
            // Handle unsuccessful startups of ImageJ (these will only be called if explorer is still open)
            imageJProcess.on("error", reportErrorToUser);
            imageJProcess.on("exit", async (code: number) => {
                if (code !== 0) {
                    await reportErrorToUser(`Status Code ${code}`);
                }
            });
        } catch (error) {
            await reportErrorToUser(error);
        }
    }
}
