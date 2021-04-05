import NotificationService from ".";

export default class NotificationServiceNoop implements NotificationService {
    public showMessage() {
        return Promise.resolve(false);
    }

    public showError() {
        return Promise.resolve();
    }

    public showQuestion() {
        return Promise.resolve(false);
    }
}
