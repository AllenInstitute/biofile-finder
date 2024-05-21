import { ApplicationInfoService } from "../../../core/services";

export default class ApplicationInfoServiceElectron implements ApplicationInfoService {
    public updateAvailable(): Promise<boolean> {
        return Promise.resolve(false);
    }

    public getApplicationVersion(): string {
        return "999.999.999";
    }

    public getUserName(): string {
        return "Anonymous Web User";
    }
}
