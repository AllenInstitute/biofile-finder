import ExecutionEnvService from ".";

export default class ExecutionEnvServiceNoop implements ExecutionEnvService {
    public formatPathForOs(posixPath: string, prefix?: string): string {
        if (prefix) {
            return `${prefix}${posixPath}`;
        }
        return posixPath;
    }

    public getOS(): string {
        return "ExecutionEnvServiceNoop::getOS";
    }

    public promptForAllenMountPoint(): Promise<string> {
        return Promise.resolve("Prompt triggered within ExecutionEnvServiceNoop.");
    }

    public promptForExecutable(): Promise<string> {
        return Promise.resolve("Prompt triggered within ExecutionEnvServiceNoop.");
    }

    public isValidAllenMountPoint(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public isValidExecutable(): Promise<boolean> {
        return Promise.resolve(false);
    }
}
