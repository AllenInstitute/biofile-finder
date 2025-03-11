import { ExecutionEnvService, SaveLocationResolution } from "../../../core/services";

export default class ExecutionEnvServiceWeb implements ExecutionEnvService {
    public async formatPathForHost(posixPath: string): Promise<string> {
        return posixPath;
    }

    public getFilename(filePath: string): string {
        return filePath.replace(/^.*[\\/]/, "");
    }

    public getOS(): string {
        const lowerCaseUserAgent = navigator.userAgent.toLowerCase();
        if (lowerCaseUserAgent.includes("Darwin")) {
            return "Darwin";
        } else if (lowerCaseUserAgent.includes("Windows")) {
            return "Windows_NT";
        } else if (lowerCaseUserAgent.includes("Linux")) {
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

    public openNativeFileBrowser(): void {
        throw Error("ExecutionEnvServiceWeb::openNativeFileBrowser not yet implemented");
    }
}
