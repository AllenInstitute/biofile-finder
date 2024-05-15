import { ExecutionEnvService, SaveLocationResolution } from "../../../core/services";

export default class ExecutionEnvServiceWeb implements ExecutionEnvService {
    public async formatPathForHost(posixPath: string): Promise<string> {
        return posixPath;
    }

    public getFilename(filePath: string): string {
        return filePath.replace(/^.*[\\/]/, '');
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

    public async promptForExecutable(
        promptTitle: string,
        reasonForPrompt?: string
    ): Promise<string> {
        console.log(promptTitle, reasonForPrompt);
        throw Error("blah");
    }

    public async promptForFile(extensions?: string[], reasonForPrompt?: string): Promise<string> {
        console.log(extensions, reasonForPrompt);
        throw Error("blah");
    }

    public async promptForSaveLocation(promptTitle?: string): Promise<SaveLocationResolution> {
        console.log(promptTitle);
        throw Error("blah");
    }
}
