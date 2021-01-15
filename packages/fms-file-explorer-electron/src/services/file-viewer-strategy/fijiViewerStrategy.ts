import childProcess from "child_process";
import { promises as fsPromises } from "fs";
import os from "os";
import path from "path";

import ViewerStrategy from "./ViewerStrategy";

const isBioFormat = (filePath: string) => {
    return [".tiff", ".tif", ".czi"].includes(path.extname(filePath));
};

const escapeBackSlashes = (str: string): string => {
    return [...str].reduce((next, char) => {
        if (char === "\\") {
            return `${next}\\\\`;
        }
        return `${next}${char}`;
    }, "");
};

/**
 * Spawn FIJI with a templated, JavaScript-based "plugin" that is run on open.
 *
 * When you open a file directly from the ImageJ/FIJI UI, the program will delegate opening the image to
 * plugins (e.g., BioFormats plugin) if available. Opening from the commandline by passing the file path
 * directly to the executable (the "defaultViewerStrategy"), however, does not have this same side-effect
 * of delegation to plugins. In practice, this means that certain types of images are displayed/interpretted
 * incorrectly by FIJI. While this is fundamentally a problem with FIJI itself, the way to get around this
 * issue is to programmatically control how images are opened (i.e., with which plugin). This strategy
 * will delegate opening TIFF, OME-TIFF, and CZI files to the BioFormats FIJI plugin, and everything else
 * to the default ImageJ file opener.
 * Review https://aicsjira.corp.alleninstitute.org/browse/FMS-1409 for more in-depth context.
 *
 * Re-raise error, if any.
 */
const fijiViewerStrategy: ViewerStrategy = async (executable, filePaths) => {
    // Contents of entrypoint script for Fiji.
    // Reference:
    //   - Guide: https://imagej.net/Javascript_Scripting
    //   - Javadoc: https://imagej.nih.gov/ij/developer/api/index.html
    const contents = `
        importClass(Packages.ij.IJ);
        importClass(Packages.loci.plugins.LociImporter);

        var bioFormatImgs = [
            ${filePaths.filter(isBioFormat).map(escapeBackSlashes).join(",")}
        ];
        var standardImgs = [
            ${filePaths
                .filter((filePath) => !isBioFormat(filePath))
                .map(escapeBackSlashes)
                .join(",")}
        ];

        var importer = new LociImporter();
        for (var i = 0; i < bioFormatImgs.length; i += 1) {
            importer.run(bioFormatImgs[i]);
        }
        for (var i = 0; i < standardImgs.length; i += 1) {
            var imp = IJ.openImage(standardImgs[i]);
            imp.show();
        }
    `.trim();

    const tempDirPath = path.join(os.tmpdir(), "fms-explorer");
    await fsPromises.mkdir(tempDirPath, { recursive: true });
    const now = new Date();
    const scriptPath = path.join(
        tempDirPath,
        `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}-${now.getUTCSeconds()}_fiji-entry-point.js`
    );
    const entryPointScript: fsPromises.FileHandle = await fsPromises.open(scriptPath, "w");
    await entryPointScript.writeFile(contents, "utf-8");
    await entryPointScript.close();

    const executableProcess = childProcess.spawn(executable, ["--run", scriptPath], {
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

export default fijiViewerStrategy;
