import { ExecutionEnvService, SaveLocationResolution } from "../../../core/services";

export default class ExecutionEnvServiceWeb implements ExecutionEnvService {
    public async formatPathForHost(posixPath: string): Promise<string> {
        if (this.getOS() === "Windows_NT") {
            const parts = posixPath.split("/");
            const formatted = parts.join("\\");
            return `\\${formatted}`;
        }
        return posixPath;
    }

    public getFilename(filePath: string): string {
        return filePath.replace(/^.*[\\/]/, "");
    }

    public getOS(): string {
        const lowerCaseUserAgent = navigator.userAgent.toLowerCase();
        if (lowerCaseUserAgent.includes("macintosh") || lowerCaseUserAgent.includes("mac os")) {
            return "Darwin";
        } else if (lowerCaseUserAgent.includes("windows")) {
            return "Windows_NT";
        } else if (lowerCaseUserAgent.includes("linux")) {
            return "Linux";
        }
        return navigator.userAgent;
    }

    public async promptForExecutable(): Promise<string> {
        throw Error("ExecutionEnvServiceWeb::promptForExecutable not yet implemented");
    }

    public async promptForFile(): Promise<string> {
        throw Error("ExecutionEnvServiceWeb::promptForFile not yet implemented");
    }

    public async promptForSaveLocation(): Promise<SaveLocationResolution> {
        throw Error("ExecutionEnvServiceWeb::promptForSaveLocation not yet implemented");
    }
}
