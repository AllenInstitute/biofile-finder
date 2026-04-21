import { memoize } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import NotificationServiceWeb from "./services/NotificationServiceWeb";
import DatabaseServiceWeb from "./services/DatabaseServiceWeb";
import FileDownloadServiceWeb from "./services/FileDownloadServiceWeb";
import PersistentConfigServiceWeb from "./services/PersistentConfigServiceWeb";
import FmsFileExplorer from "../../core/App";
import { createReduxStore } from "../../core/state";

import "../../core/styles/global.css";
import styles from "./src.module.css";

const APP_ID = "biofile-finder";

async function asyncRender() {
    const persistentConfigService = new PersistentConfigServiceWeb();
    const databaseService = new DatabaseServiceWeb();
    await databaseService.initialize();

    // Memoized to make sure the object that collects these services doesn't
    // unnecessarily change with regard to referential equality between re-renders of the application
    const collectPlatformDependentServices = memoize(() => ({
        databaseService,
        notificationService: new NotificationServiceWeb(),
        fileDownloadService: new FileDownloadServiceWeb(),
        persistentConfigService,
    }));
    const store = createReduxStore({
        isOnWeb: true,
        persistedConfig: persistentConfigService.getAll(),
        platformDependentServices: collectPlatformDependentServices(),
    });
    render(
        <Provider store={store}>
            <FmsFileExplorer className={styles.app} />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

asyncRender();
