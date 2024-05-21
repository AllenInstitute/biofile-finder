import "regenerator-runtime/runtime";

import { memoize } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import NotificationServiceWeb from "./services/NotificationServiceWeb";
import ApplicationInfoServiceWeb from "./services/ApplicationInfoServiceWeb";
import ExecutionEnvServiceWeb from "./services/ExecutionEnvServiceWeb";
import DatabaseServiceWeb from "./services/DatabaseServiceWeb";
import FmsFileExplorer from "../../core/App";
import { createReduxStore } from "../../core/state";
import FileViewerServiceWeb from "./services/FileViewerServiceWeb";
import FileDownloadServiceWeb from "./services/FileDownloadServiceWeb";

const APP_ID = "fms-file-explorer-web";

async function asyncRender() {
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
        fileDownloadService: new FileDownloadServiceWeb(),
    }));
    const store = createReduxStore({
        isOnWeb: true,
        platformDependentServices: collectPlatformDependentServices(),
    });
    render(
        <Provider store={store}>
            <FmsFileExplorer />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

asyncRender();
