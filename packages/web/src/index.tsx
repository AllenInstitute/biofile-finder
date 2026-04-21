import { memoize } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import NotificationServiceWeb from "./services/NotificationServiceWeb";
import ApplicationInfoServiceWeb from "./services/ApplicationInfoServiceWeb";
import DatabaseServiceWeb from "./services/DatabaseServiceWeb";
import ExecutionEnvServiceWeb from "./services/ExecutionEnvServiceWeb";
import FileViewerServiceWeb from "./services/FileViewerServiceWeb";
import FileDownloadServiceWeb from "./services/FileDownloadServiceWeb";
import PersistentConfigServiceWeb from "./services/PersistentConfigServiceWeb";
import FmsFileExplorer from "../../core/App";
import { createReduxStore } from "../../core/state";

import "../../core/styles/global.css";
import styles from "./src.module.css";
import S3StorageService from "../../core/services/S3StorageService";

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
        executionEnvService: new ExecutionEnvServiceWeb(),
        applicationInfoService: new ApplicationInfoServiceWeb(),
        fileViewerService: new FileViewerServiceWeb(),
        fileDownloadService: new FileDownloadServiceWeb(new S3StorageService()),
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
