import ApplicationInfoService from ".";

export default class ApplicationInfoServiceNoop implements ApplicationInfoService {
    public updateAvailable() {
        return Promise.resolve(false);
    }

    public getApplicationVersion() {
        return "0.0.0";
    }

    public getUserName() {
        return undefined;
    }
}
