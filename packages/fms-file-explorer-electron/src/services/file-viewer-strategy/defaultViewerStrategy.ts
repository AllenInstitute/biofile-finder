import childProcess from "child_process";

import ViewerStrategy from "./ViewerStrategy";

/**
 * Spawn executable with filepaths as arguments. Re-raise error.
 */
const defaultViewerStrategy: ViewerStrategy = async (executable, filePaths) => {
    const executableProcess = childProcess.spawn(executable, filePaths, {
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

export default defaultViewerStrategy;
