import * as path from "path";

export default class FmsFilePath {
    private mountPoint: string | undefined;
    private os: string;
    private pathSeparator: string = path.sep;
    private posixFilePath: string;
    private splitPath: string[];

    constructor(posixFilePath: string, os: string, pathSeparator?: string) {
        this.os = os;
        this.posixFilePath = posixFilePath;
        this.splitPath = posixFilePath.split(path.posix.sep);

        if (pathSeparator) {
            this.pathSeparator = pathSeparator;
        }
    }

    public get server(): string {
        return this.splitPath[0] !== "" ? this.splitPath[0] : this.splitPath[1];
    }

    public get fileShare(): string {
        return this.splitPath[0] !== "" ? this.splitPath[1] : this.splitPath[2];
    }

    public get assumedFSMount(): string {
        return path.posix.join("", this.server, this.fileShare);
    }

    public withMountPoint(mountPoint: string): FmsFilePath {
        this.mountPoint = mountPoint;
        return this;
    }

    public formatForOs(): string {
        // If `mountPoint` is defined, replace /<server>/<fileShare> within
        // the original path.
        let pathToFormat = this.posixFilePath;
        if (this.mountPoint) {
            const pathWithoutMount = path.relative(this.assumedFSMount, this.posixFilePath);
            pathToFormat = path.join(this.mountPoint, pathWithoutMount);
        }

        // Assumption: file paths are persisted as POSIX paths
        const split = pathToFormat.split(path.posix.sep);

        // Rejoin using `pathSeparator`
        const formatted = split.join(this.pathSeparator);

        if (this.os === "win32") {
            // `formatted`, at this point, will look something like `\\allen\\programs\\allencell\\...`
            // Assume that the first path component is actually a server,
            // and prepend an additional escaped backslash (`\\`) to turn the path into a UNC path.
            return `\\${formatted}`;
        }

        return formatted;
    }
}
