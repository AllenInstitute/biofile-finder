import ApplicationInfoService from ".";

export default class ApplicationInfoServiceNoop implements ApplicationInfoService {
    public updateAvailable() {
        return Promise.resolve(false);
    }
}
