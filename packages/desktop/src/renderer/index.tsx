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
import { createReduxStore, interaction, selection } from "../../../core/state";
import ApplicationInfoServiceElectron from "../services/ApplicationInfoServiceElectron";
import DatabaseServiceElectron from "../services/DatabaseServiceElectron";
import ExecutionEnvServiceElectron from "../services/ExecutionEnvServiceElectron";
import FileDownloadServiceElectron from "../services/FileDownloadServiceElectron";
import FileViewerServiceElectron from "../services/FileViewerServiceElectron";
import PersistentConfigServiceElectron from "../services/PersistentConfigServiceElectron";
import NotificationServiceElectron from "../services/NotificationServiceElectron";
import useKeyDown from "../../../core/hooks/useKeyDown";
import "../../../core/styles/global.css";

const APP_ID = "fms-file-explorer";

const notificationService = new NotificationServiceElectron();
const persistentConfigService = new PersistentConfigServiceElectron();
const applicationInfoService = new ApplicationInfoServiceElectron();
const databaseService = new DatabaseServiceElectron();
const executionEnvService = new ExecutionEnvServiceElectron(notificationService);

// Define the KeyDownHandler component inline
const KeyDownHandler: React.FC<{ clearStore: () => void }> = ({ clearStore }) => {
    useKeyDown(["Control", "]"], clearStore);
    return null;
};

// Clears the persistent store but retains `Environment` to prevent misalignment
// between the data source and the selected menu item in the app.
const clearPersistentStore = () => {
    const currentEnvironment =
        persistentConfigService.get(PersistedConfigKeys.Environment) || "PRODUCTION";
    persistentConfigService.clear();
    persistentConfigService.persist({ [PersistedConfigKeys.Environment]: currentEnvironment });
    window.location.reload();
};

// Application analytics/metrics
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
const collectPlatformDependentServices = memoize(() => ({
    applicationInfoService,
    databaseService,
    executionEnvService,
    fileDownloadService: new FileDownloadServiceElectron(),
    fileViewerService: new FileViewerServiceElectron(notificationService),
    frontendInsights,
}));

const frontendInsightsMiddleware = reduxMiddleware(frontendInsights, {
    useActionAsProperties: true,
});
const store = createReduxStore({
    middleware: [frontendInsightsMiddleware],
    persistedConfig: persistentConfigService.getAll(),
    platformDependentServices: collectPlatformDependentServices(),
});
// https://redux.js.org/api/store#subscribelistener
store.subscribe(() => {
    const state = store.getState();
    const columns = selection.selectors.getColumns(state);
    const queries = selection.selectors.getQueries(state);
    const csvColumns = interaction.selectors.getCsvColumns(state);
    const hasUsedApplicationBefore = interaction.selectors.hasUsedApplicationBefore(state);
    const recentAnnotations = selection.selectors.getRecentAnnotations(state);
    const userSelectedApplications = interaction.selectors.getUserSelectedApplications(state);

    const appState = {
        [PersistedConfigKeys.Columns]: columns,
        [PersistedConfigKeys.CsvColumns]: csvColumns,
        [PersistedConfigKeys.HasUsedApplicationBefore]: hasUsedApplicationBefore,
        [PersistedConfigKeys.Queries]: queries,
        [PersistedConfigKeys.RecentAnnotations]: recentAnnotations,
        [PersistedConfigKeys.UserSelectedApplications]: userSelectedApplications,
    };

    const oldAppState = Object.keys(appState).reduce(
        (acc, configKey) => ({
            ...acc,
            [configKey]: persistentConfigService.get(configKey as PersistedConfigKeys),
        }),
        {}
    );
    if (JSON.stringify(appState) !== JSON.stringify(oldAppState)) {
        persistentConfigService.persist(appState);
    }
});

function renderFmsFileExplorer() {
    render(
        <Provider store={store}>
            <>
                <KeyDownHandler clearStore={clearPersistentStore} />
                <FmsFileExplorer
                    environment={persistentConfigService.get(PersistedConfigKeys.Environment)}
                />
            </>
        </Provider>,
        document.getElementById(APP_ID)
    );
}

// Listen for environment updates from the main process.
ipcRenderer.on("environment-changed", (_, newEnvironment: string) => {
    persistentConfigService.persist(PersistedConfigKeys.Environment, newEnvironment);
    renderFmsFileExplorer();
});

renderFmsFileExplorer();
