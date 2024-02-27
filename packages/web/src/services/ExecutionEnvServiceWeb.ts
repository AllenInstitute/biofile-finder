import {
    ExecutionEnvService,
    ExecutableEnvCancellationToken,
    SaveLocationResolution,
} from "../../../core/services";
import NotificationServiceWeb from "./NotificationServiceWeb";

export default class ExecutionEnvServiceWeb implements ExecutionEnvService {
    private notificationService: NotificationServiceWeb;

    public constructor(notificationService: NotificationServiceWeb) {
        this.notificationService = notificationService;
    }

    public async formatPathForHost(posixPath: string): Promise<string> {
        return "";
    }

    public getFilename(filePath: string): string {
        return "";
    }

    public getOS(): string {
        const lowerCaseUserAgent = navigator.userAgent.toLowerCase();
        if (lowerCaseUserAgent.includes("Darwin")) {
            return "Darwin"
        } else if (lowerCaseUserAgent.includes("Windows")) {
            return 'Windows_NT'
        } else if (lowerCaseUserAgent.includes("Linux")) {
            return "Linux";
        }
        return navigator.userAgent;
    }

    public async promptForExecutable(
        promptTitle: string,
        reasonForPrompt?: string
    ): Promise<string> {
        throw Error("blah");
    }

    public async promptForFile(extensions?: string[], reasonForPrompt?: string): Promise<string> {
        throw Error("blah");
    }

    public async promptForSaveLocation(promptTitle?: string): Promise<SaveLocationResolution> {
        throw Error("blah");
    }
}
