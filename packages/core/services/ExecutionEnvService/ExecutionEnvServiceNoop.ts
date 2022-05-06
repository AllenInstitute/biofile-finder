import ExecutionEnvService from ".";

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

    public promptForExecutable(): Promise<string> {
        return Promise.resolve("Prompt triggered within ExecutionEnvServiceNoop.");
    }

    public isValidExecutable(): Promise<boolean> {
        return Promise.resolve(false);
    }
}
