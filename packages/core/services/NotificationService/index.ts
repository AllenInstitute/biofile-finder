/**
 * Interface that defines a platform-dependent service for notifying the user of
 * an event using their platform's system.
 */
export default interface NotificationService {
    /**
     * Displays the given message to the user using their native message box.
     * Returns whether the message was accepted or declined.
     */
    showMessage(title: string, message: string): Promise<boolean>;

    /**
     * Displays the given message to the user using their native error box.
     */
    showError(title: string, message: string): Promise<void>;

    /**
     * Display the given question to the user using their native message box.
     * Returns whether the answer was yes or no.
     */
    showQuestion(title: string, message: string): Promise<boolean>;
}
