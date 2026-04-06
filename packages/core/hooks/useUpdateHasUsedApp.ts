import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { PersistedConfigKeys } from "../services";
import { interaction } from "../state";
import { runAllTutorials } from "../state/selection/actions";

export default () => {
    const dispatch = useDispatch();
    const { persistentConfigService } = useSelector(
        interaction.selectors.getPlatformDependentServices
    );
    React.useEffect(() => {
        // Check localstorage cookies
        const hasUsedApp = persistentConfigService.get(
            PersistedConfigKeys.HasUsedApplicationBefore
        );
        if (!hasUsedApp) {
            // If first time using app, start running tutorials
            dispatch(runAllTutorials());

            // Mark as true for next time
            dispatch(interaction.actions.markAsUsedApplicationBefore());
            persistentConfigService.persist(PersistedConfigKeys.HasUsedApplicationBefore, true);
        }
    }, [dispatch, persistentConfigService]);
};
