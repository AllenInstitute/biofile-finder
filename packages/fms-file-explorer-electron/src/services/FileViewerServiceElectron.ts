import childProcess from "child_process";

import { ipcRenderer } from "electron";

import PersistentConfigServiceElectron from "./PersistentConfigServiceElectron";

import { FileViewerService } from "@aics/fms-file-explorer-core";

export default class FileViewerServiceElectron implements FileViewerService {

    public async openFilesInImageJ(filePaths: string[], imageJExecutable?: string) {
        const reportErrorToUser = async (error: string) => {
            await this.showErrorMessage("Opening file in ImageJ",
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`);
        }
        try {
            let imageJProcess: childProcess.ChildProcess;
            // Create a child process for ImageJ to open files in
            if (imageJExecutable) {
                imageJProcess =  childProcess.spawn(imageJExecutable, filePaths);
            } else {
                // On MacOS we can simply supply the name of an app to open it
                imageJProcess =  childProcess.spawn(`open -a "ImageJ.app" --args ${filePaths}`);
            }
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

    private async showErrorMessage(title: string, content: string) {
        await ipcRenderer.invoke(PersistentConfigServiceElectron.SHOW_ERROR_BOX, title, content);
    }
}
