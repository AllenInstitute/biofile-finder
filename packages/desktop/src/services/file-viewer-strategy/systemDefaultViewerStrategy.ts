import * as os from "os";
import * as path from "path";

import childProcess from "child_process";
import { Platform } from "../ExecutionEnvServiceElectron";

import ViewerStrategy from "./ViewerStrategy";

const PROGRAMS_FOLDER_SEP = `${path.sep}programs${path.sep}allencell${path.sep}`;

/**
 * Spawn executable with default system command for opening files with file paths as arguments.
 */
const systemDefaultViewerStrategy: ViewerStrategy = async (_, filePaths) => {
    // Determine the default system command for opening files (default Linux)
    let cwd: string | undefined;
    let shell: string | boolean = false;
    let command = "gio";
    let args = ["open", ...filePaths];
    if (os.platform() === Platform.Mac) {
        command = "open";
        args = filePaths;
    } else if (os.platform() === Platform.Windows) {
        shell = true;
        command = "start";
        // Set current working directory to inside allen drive to avoid
        // weirdness with the "start" command and UNC paths
        cwd = `${filePaths[0].split(PROGRAMS_FOLDER_SEP)[0]}${PROGRAMS_FOLDER_SEP}`;
        const files = filePaths.map((filePath) => filePath.split(PROGRAMS_FOLDER_SEP)[1]);
        // The "start" command does not accept multiple file arguments so
        // this chains the commands together instead
        args = files.join(" ; start ").split(" ");
    }

    const executableProcess = childProcess.spawn(command, args, {
        cwd,
        shell,
        detached: true,
        stdio: "ignore", // If the parent's stdio is inherited, the child will remain attached to the controlling terminal.
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
