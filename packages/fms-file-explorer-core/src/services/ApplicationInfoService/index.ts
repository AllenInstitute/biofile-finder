/**
 * Interface that defines a platform-dependent service for returning information regarding the application.
 */
export default interface ApplicationInfoService {
    /**
     * Determine whether there is a more recent build of the application available for download.
     */
    updateAvailable(): Promise<boolean>;

    /**
     * Returns the current application version
     */
    getApplicationVersion(): Promise<string>;
}
