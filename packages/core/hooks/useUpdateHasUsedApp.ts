import * as React from "react";
import { useDispatch } from "react-redux";

import { PersistedConfigKeys } from "../services";
import { markAsUsedApplicationBefore } from "../state/interaction/actions";
import { runAllTutorials } from "../state/selection/actions";
import PersistentConfigServiceWeb from "../../web/src/services/PersistentConfigServiceWeb";

export default () => {
    const dispatch = useDispatch();
    React.useEffect(() => {
        const persistentConfigService = new PersistentConfigServiceWeb();
        // Check localstorage cookies
        const hasUsedApp = persistentConfigService.get(
            PersistedConfigKeys.HasUsedApplicationBefore
        );
        if (!hasUsedApp) {
            // If first time using app, start running tutorials
            dispatch(runAllTutorials());

            // Mark as true for next time
            dispatch(markAsUsedApplicationBefore());
            persistentConfigService.persist(PersistedConfigKeys.HasUsedApplicationBefore, true);
        }
    }, [dispatch]);
};
