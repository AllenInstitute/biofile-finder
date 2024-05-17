import { NotificationService } from "../../../core/services";

export default class NotificationServiceWeb implements NotificationService {
    public showMessage(): Promise<boolean> {
        throw new Error("NotificationServiceWeb::showMessage is not yet implemented");
    }

    public async showError(): Promise<void> {
        throw new Error("NotificationServiceWeb::showError is not yet implemented");
    }
}
