import { NotificationService } from "../../../core/services";

export default class NotificationServiceWeb implements NotificationService {
    public showMessage(title: string, message: string): Promise<boolean> {
        const x = prompt(`${title}: ${message}`, "No");
        console.log(x);
        return Promise.resolve(x === "No");
    }

    public async showError(title: string, message: string): Promise<void> {
        alert(`${title}: ${message}`);
    }

    public async showQuestion(title: string, message: string): Promise<boolean> {
        return this.showMessage(title, message);
    }
}
