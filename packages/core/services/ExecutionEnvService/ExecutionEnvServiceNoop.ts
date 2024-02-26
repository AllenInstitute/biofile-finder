import ExecutionEnvService, { SaveLocationResolution } from ".";

export default class ExecutionEnvServiceNoop implements ExecutionEnvService {
    public async formatPathForHost(posixPath: string): Promise<string> {
        return posixPath;
    }

    public getFilename(): string {
        return "ExecutionEnvServiceNoop::getFilename";
    }

    public getOS(): string {
        return "ExecutionEnvServiceNoop::getOS";
    }

    public promptForSaveLocation(): Promise<SaveLocationResolution> {
        return Promise.reject("ExecutionEnvServiceNoop:promptForSaveLocation");
    }

    public promptForExecutable(): Promise<string> {
        return Promise.resolve("Prompt triggered within ExecutionEnvServiceNoop.");
    }

    public promptForFile(): Promise<string> {
        return Promise.resolve("ExecutionEnvServiceNoop::promptForFile");
    }

    public isValidExecutable(): Promise<boolean> {
        return Promise.resolve(false);
    }
}
