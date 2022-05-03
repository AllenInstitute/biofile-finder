import * as path from "path";

/**
 * Value object for encapsulating minor queries and operations
 * on file paths to FMS data.
 *
 * Assumes FMS file paths are:
 *  1. absolute
 *  2. in POSIX format
 *  3. remote (and therefore accessed via SMB/NFS)
 *  4. formatted as `/<server>/<fileShare>/path/to/object.foo`
 */
export default class FmsFilePath {
    private mountPoint: string | undefined;
    private parts: string[];
    private posixFilePath: string;

    constructor(posixFilePath: string) {
        this.posixFilePath = posixFilePath;
        this.parts = posixFilePath.split(path.posix.sep);
    }

    /**
     * E.g., given "/allen/programs/allencell/.../file.txt", return "programs"
     */
    public get fileShare(): string {
        // Because POSIX paths saved in DB are absolute (i.e., start with "/")
        // the 0th part of this path is expected to be an empty string.
        return this.parts[2];
    }

    /**
     * E.g., given "/allen/programs/allencell/.../file.txt", return "allen"
     */
    public get server(): string {
        // Because POSIX paths saved in DB are absolute (i.e., start with "/")
        // the 0th part of this path is expected to be an empty string.
        return this.parts[1];
    }

    /**
     * Return formatted file system path that takes into account
     *   1. the path separator for the operating system this application is running within
     *   2. the mount point for the file share of FMS data on this host.
     *
     * The parameter `os` should be the output of `os.type()`.
     */
    public formatForOs(os: string, pathSeparator = path.sep): string {
        // If `mountPoint` is defined, replace /<server>/<fileShare> within
        // the original path.
        let pathToFormat = this.posixFilePath;
        if (this.mountPoint) {
            const pathWithoutMount = path.posix.relative(
                this.assumedFileSystemMount,
                this.posixFilePath
            );
            pathToFormat = path.join(this.mountPoint, pathWithoutMount);
        }

        // Assumption: file paths are persisted as POSIX paths
        const split = pathToFormat.split(path.posix.sep);

        // Rejoin using `pathSeparator`
        const formatted = split.join(pathSeparator);

        if (os === "Windows_NT") {
            // `formatted`, at this point, will look something like `\\allen\\programs\\allencell\\...`
            // Prepend an additional escaped backslash (`\\`) to turn the path into a UNC path.
            return `\\${formatted}`;
        }

        return formatted;
    }

    /**
     * E.g., fmsPath.withMountPoint("/Volumes/programs")
     */
    public withMountPoint(mountPoint: string): FmsFilePath {
        this.mountPoint = mountPoint;
        return this;
    }

    /**
     * This is the file system mount assumed by the FMS database file paths.
     * It is always in POSIX format.
     * E.g., "/allen/programs" (production) or "/allen/aics" (staging)
     */
    private get assumedFileSystemMount(): string {
        return `/${this.server}/${this.fileShare}`;
    }
}
