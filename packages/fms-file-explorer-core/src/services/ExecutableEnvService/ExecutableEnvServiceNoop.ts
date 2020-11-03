import ExecutableEnvService from ".";

export default class ExecutableEnvServiceNoop implements ExecutableEnvService {
    public promptForAllenMountPoint(): Promise<string> {
        return Promise.resolve("Prompt triggered within ExecutableEnvServiceNoop.");
    }

    public promptForExecutable(): Promise<string> {
        return Promise.resolve("Prompt triggered within ExecutableEnvServiceNoop.");
    }

    public isValidAllenMountPoint(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public isValidExecutable(): Promise<boolean> {
        return Promise.resolve(false);
    }
}
