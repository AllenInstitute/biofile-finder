import * as os from "os";

import childProcess from "child_process";
import { Platform } from "../ExecutionEnvServiceElectron";

import ViewerStrategy from "./ViewerStrategy";

/**
 * Spawn executable with default system command for opening files with file paths as arguments.
 */
const systemDefaultViewerStrategy: ViewerStrategy = async (_, filePaths) => {
    // Determine the default system command for opening files (default Linux)
    let detached = true;
    let shell: string | boolean = false;
    let command = "gio";
    let args = ["open", ...filePaths];
    if (os.platform() === Platform.Mac) {
        command = "open";
        args = filePaths;
    } else if (os.platform() === Platform.Windows) {
        detached = false;
        shell = "PowerShell.exe";
        command = "start";
        args = filePaths.flatMap((path, index) => {
            if (index === 0) {
                return [path];
            }
            // The "start" command does not accept multiple file arguments so
            // this chains the commands together instead
            return [";", "start", path];
        });
    }

    const executableProcess = childProcess.spawn(command, args, {
        shell,
        detached,
        stdio: "ignore",
    });

    // From the docs: https://nodejs.org/docs/latest-v12.x/api/child_process.html#child_process_options_detached
    // By default, the parent will wait for the detached child to exit.
    // To prevent the parent from waiting for a given subprocess to exit, use the subprocess.unref() method.
    // Doing so will cause the parent's event loop to not include the child in its reference count,
    // allowing the parent to exit independently of the child, unless there is an established IPC channel between the child and the parent.
    executableProcess.unref();

    executableProcess.on("error", (err) => {
        throw err;
    });
};

export default systemDefaultViewerStrategy;
