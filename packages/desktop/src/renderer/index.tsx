import "regenerator-runtime/runtime";

import FrontendInsights, { LogLevel, reduxMiddleware } from "@aics/frontend-insights";
import AmplitudeNodePlugin from "@aics/frontend-insights-plugin-amplitude-node";
import { ipcRenderer } from "electron";
import { memoize } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import FmsFileExplorer from "../../../core/App";
import { PersistedConfigKeys } from "../../../core/services";
import { createReduxStore, interaction } from "../../../core/state";

import ApplicationInfoServiceElectron from "../services/ApplicationInfoServiceElectron";
import CsvDatabaseServiceElectron from "../services/CsvDatabaseServiceElectron";
import ExecutionEnvServiceElectron from "../services/ExecutionEnvServiceElectron";
import FileDownloadServiceElectron from "../services/FileDownloadServiceElectron";
import FileViewerServiceElectron from "../services/FileViewerServiceElectron";
import PersistentConfigServiceElectron from "../services/PersistentConfigServiceElectron";
import NotificationServiceElectron from "../services/NotificationServiceElectron";
import { GlobalVariableChannels, FileDownloadServiceBaseUrl } from "../util/constants";

const APP_ID = "fms-file-explorer";

const notificationService = new NotificationServiceElectron();
const persistentConfigService = new PersistentConfigServiceElectron();
const applicationInfoService = new ApplicationInfoServiceElectron();
const csvDatabaseService = new CsvDatabaseServiceElectron();
const executionEnvService = new ExecutionEnvServiceElectron(notificationService);
// application analytics/metrics
const frontendInsights = new FrontendInsights(
    {
        application: {
            name: APP_ID,
            version: applicationInfoService.getApplicationVersion(),
        },
        userInfo: {
            userId: applicationInfoService.getUserName(),
        },
        session: {
            platform: "Electron",
            deviceId: `${applicationInfoService.getUserName()}-${executionEnvService.getOS()}`,
        },
        loglevel: process.env.NODE_ENV === "production" ? LogLevel.Error : LogLevel.Debug,
    },
    [new AmplitudeNodePlugin({ apiKey: process.env.AMPLITUDE_API_KEY })]
);
frontendInsights.dispatchUserEvent({ type: "SESSION_START" });

// Memoized to make sure the object that collects these services doesn't
// unnecessarily change with regard to referential equality between re-renders of the application
const collectPlatformDependentServices = memoize(
    (downloadServiceBaseUrl: FileDownloadServiceBaseUrl) => ({
        applicationInfoService,
        csvDatabaseService,
        executionEnvService,
        fileDownloadService: new FileDownloadServiceElectron(
            notificationService,
            downloadServiceBaseUrl
        ),
        fileViewerService: new FileViewerServiceElectron(notificationService),
        frontendInsights,
        persistentConfigService,
    })
);

const frontendInsightsMiddleware = reduxMiddleware(frontendInsights, {
    useActionAsProperties: true,
});
const store = createReduxStore({
    middleware: [frontendInsightsMiddleware],
    persistedConfig: persistentConfigService.getAll(),
});
// https://redux.js.org/api/store#subscribelistener
store.subscribe(() => {
    const state = store.getState();
    const csvColumns = interaction.selectors.getCsvColumns(state);
    const userSelectedApplications = interaction.selectors.getUserSelectedApplications(state);
    const hasUsedApplicationBefore = interaction.selectors.hasUsedApplicationBefore(state);
    const appState = {
        [PersistedConfigKeys.CsvColumns]: csvColumns,
        [PersistedConfigKeys.UserSelectedApplications]: userSelectedApplications,
    };
    if (JSON.stringify(appState) !== JSON.stringify(persistentConfigService.getAll())) {
        persistentConfigService.persist({
            [PersistedConfigKeys.CsvColumns]: csvColumns,
            [PersistedConfigKeys.UserSelectedApplications]: userSelectedApplications,
            [PersistedConfigKeys.HasUsedApplicationBefore]: hasUsedApplicationBefore,
        });
    }
});

function renderFmsFileExplorer() {
    render(
        <Provider store={store}>
            <FmsFileExplorer
                fileExplorerServiceBaseUrl={global.fileExplorerServiceBaseUrl}
                platformDependentServices={collectPlatformDependentServices(
                    global.fileDownloadServiceBaseUrl as FileDownloadServiceBaseUrl
                )}
            />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

ipcRenderer.addListener(
    GlobalVariableChannels.BaseUrl,
    (_, { fileExplorerServiceBaseUrl, fileDownloadServiceBaseUrl }) => {
        global.fileDownloadServiceBaseUrl = fileDownloadServiceBaseUrl;
        global.fileExplorerServiceBaseUrl = fileExplorerServiceBaseUrl;
        renderFmsFileExplorer();
    }
);

renderFmsFileExplorer();
