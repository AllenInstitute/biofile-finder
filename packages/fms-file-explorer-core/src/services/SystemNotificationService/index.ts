/**
 * Interface that defines a platform-dependent service for interacting with the user via native systems.
 */
export default interface SystemNotificationService {
    /**
     * Notifies the user of an error via their native error alerting system
     */
    showErrorMessage(title: string, content: string): Promise<void>;
}
