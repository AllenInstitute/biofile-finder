import "regenerator-runtime/runtime";

import FrontendInsights, { LogLevel, reduxMiddleware } from "@aics/frontend-insights";
import AmplitudeNodePlugin from "@aics/frontend-insights-plugin-amplitude-node";
import { ipcRenderer } from "electron";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import FmsFileExplorer from "../../../core/App";
import { PersistedConfigKeys } from "../../../core/services";
import { createReduxStore, interaction } from "../../../core/state";

import ApplicationInfoServiceElectron from "../services/ApplicationInfoServiceElectron";
import ExecutionEnvServiceElectron from "../services/ExecutionEnvServiceElectron";
import FileDownloadServiceElectron from "../services/FileDownloadServiceElectron";
import FileViewerServiceElectron from "../services/FileViewerServiceElectron";
import PersistentConfigServiceElectron from "../services/PersistentConfigServiceElectron";
import NotificationServiceElectron from "../services/NotificationServiceElectron";
import { GlobalVariableChannels } from "../util/constants";

const APP_ID = "fms-file-explorer";

const notificationService = new NotificationServiceElectron();
const persistentConfigService = new PersistentConfigServiceElectron();
const applicationInfoService = new ApplicationInfoServiceElectron();
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
const platformDependentServices = {
    applicationInfoService,
    executionEnvService,
    fileDownloadService: new FileDownloadServiceElectron(),
    fileViewerService: new FileViewerServiceElectron(notificationService),
    frontendInsights,
    persistentConfigService,
};

const frontendInsightsMiddleware = reduxMiddleware(frontendInsights);
const store = createReduxStore({
    middleware: [frontendInsightsMiddleware],
    persistedConfig: persistentConfigService.getAll(),
});
// https://redux.js.org/api/store#subscribelistener
store.subscribe(() => {
    const state = store.getState();
    const allenMountPoint = interaction.selectors.getAllenMountPoint(state);
    const csvColumns = interaction.selectors.getCsvColumns(state);
    const imageJExecutable = interaction.selectors.getImageJExecutable(state);
    const userSelectedApplications = interaction.selectors.getUserSelectedApplications(state);
    const appState = {
        [PersistedConfigKeys.AllenMountPoint]: allenMountPoint,
        [PersistedConfigKeys.CsvColumns]: csvColumns,
        [PersistedConfigKeys.ImageJExecutable]: imageJExecutable,
        [PersistedConfigKeys.UserSelectedApplications]: userSelectedApplications,
    };
    if (JSON.stringify(appState) !== JSON.stringify(persistentConfigService.getAll())) {
        persistentConfigService.persist({
            [PersistedConfigKeys.AllenMountPoint]: allenMountPoint,
            [PersistedConfigKeys.CsvColumns]: csvColumns,
            [PersistedConfigKeys.ImageJExecutable]: imageJExecutable,
            [PersistedConfigKeys.UserSelectedApplications]: userSelectedApplications,
        });
    }
});

function renderFmsFileExplorer() {
    render(
        <Provider store={store}>
            <FmsFileExplorer
                allenMountPoint={global.fileExplorerServiceAllenMountPoint}
                imageJExecutable={global.fileExplorerServiceImageJExecutable}
                fileExplorerServiceBaseUrl={global.fileExplorerServiceBaseUrl}
                platformDependentServices={platformDependentServices}
            />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

ipcRenderer.addListener(GlobalVariableChannels.BaseUrl, (_, baseUrl: string) => {
    global.fileExplorerServiceBaseUrl = baseUrl;
    renderFmsFileExplorer();
});

ipcRenderer.addListener(GlobalVariableChannels.AllenMountPoint, (_, allenMountPoint?: string) => {
    global.fileExplorerServiceAllenMountPoint = allenMountPoint;
    renderFmsFileExplorer();
});

ipcRenderer.addListener(GlobalVariableChannels.ImageJExecutable, (_, imageJExecutable?: string) => {
    global.fileExplorerServiceImageJExecutable = imageJExecutable;
    renderFmsFileExplorer();
});

renderFmsFileExplorer();
