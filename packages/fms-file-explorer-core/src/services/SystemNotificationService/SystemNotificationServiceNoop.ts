import SystemNotificationService from ".";

export default class SystemNotificationServiceNoop implements SystemNotificationService {
    public showErrorMessage() {
        return Promise.resolve();
    }
}
