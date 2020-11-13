import ApplicationInfoService from ".";

export default class ApplicationInfoServiceNoop implements ApplicationInfoService {
    public updateAvailable() {
        return Promise.resolve(false);
    }

    public getApplicationVersion() {
        return Promise.resolve("ApplicationInfoServiceNoop");
    }

    public getUserName() {
        return undefined;
    }
}
