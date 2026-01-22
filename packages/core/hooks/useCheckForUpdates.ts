import { uniqueId } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../state";


/** 
 * Hook to check for updates and dispatch an event to the state
 */
export default () => {
    const dispatch = useDispatch();
    const { applicationInfoService } = useSelector(interaction.selectors.getPlatformDependentServices);

    // Check for updates to the application on startup
    React.useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const isUpdateAvailable = await applicationInfoService.updateAvailable();
                if (isUpdateAvailable) {
                    const homepage = "https://alleninstitute.github.io/biofile-finder/";
                    const msg = `A new version of the application is available!<br/>
                    Visit the <a href="${homepage}" target="_blank" title="BioFile Finder homepage">BioFile Finder homepage</a> to download.`;
                    dispatch(interaction.actions.promptUserToUpdateApp(uniqueId(), msg));
                }
            } catch (e) {
                console.warn(
                    "Failed while checking if a newer application version is available",
                    e
                );
            }
        };
        checkForUpdates();
    }, [applicationInfoService, dispatch]);
}
