import "regenerator-runtime/runtime";

import FmsFileExplorer, { createReduxStore } from "@aics/fms-file-explorer-core";
import { ipcRenderer, remote } from "electron";
import { memoize, values } from "lodash";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import ApplicationInfoServiceElectron from "./services/ApplicationInfoServiceElectron";
import ExecutableEnvServiceElectron from "./services/ExecutableEnvServiceElectron";
import FileDownloadServiceElectron from "./services/FileDownloadServiceElectron";
import FileViewerServiceElectron from "./services/FileViewerServiceElectron";
import PersistentConfigServiceElectron from "./services/PersistentConfigServiceElectron";
import NotificationServiceElectron from "./services/NotificationServiceElectron";
import { GlobalVariables, GlobalVariableChannels } from "./util/constants";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistedConfigKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");
const { interaction } = require("@aics/fms-file-explorer-core/nodejs/state");

const APP_ID = "fms-file-explorer-electron";

const notificationService = new NotificationServiceElectron();
const persistentConfigService = new PersistentConfigServiceElectron();
const platformDependentServices = {
    applicationInfoService: new ApplicationInfoServiceElectron(),
    executableEnvService: new ExecutableEnvServiceElectron(notificationService),
    fileDownloadService: new FileDownloadServiceElectron(),
    fileViewerService: new FileViewerServiceElectron(notificationService),
    persistentConfigService,
};

const store = createReduxStore(persistentConfigService.getAll());

// Sync the persisted values with the application state
function persistState(allenMountPoint: string, csvColumns: string[], imageJExecutable: string) {
    persistentConfigService.persist({
        [PersistedConfigKeys.AllenMountPoint]: allenMountPoint,
        [PersistedConfigKeys.CsvColumns]: csvColumns,
        [PersistedConfigKeys.ImageJExecutable]: imageJExecutable,
    });
}
// Memoize persisting to avoid doing it too much
const memoizedPersist = memoize(persistState, (...args) => values(args).join("_"));

// https://redux.js.org/api/store#subscribelistener
store.subscribe(() => {
    const state = store.getState();
    const allenMountPoint = interaction.selectors.getAllenMountPoint(state);
    const csvColumns = interaction.selectors.getCsvColumns(state);
    const imageJExecutable = interaction.selectors.getImageJExecutable(state);
    memoizedPersist(allenMountPoint, csvColumns, imageJExecutable);

    persistentConfigService.persist({
        [PersistedConfigKeys.AllenMountPoint]: interaction.selectors.getAllenMountPoint(state),
        [PersistedConfigKeys.CsvColumns]: interaction.selectors.getCsvColumns(state),
        [PersistedConfigKeys.ImageJExecutable]: interaction.selectors.getImageJExecutable(state),
    });
});

function renderFmsFileExplorer() {
    render(
        <Provider store={store}>
            <FmsFileExplorer
                allenMountPoint={remote.getGlobal(GlobalVariables.AllenMountPoint)}
                imageJExecutable={remote.getGlobal(GlobalVariables.ImageJExecutable)}
                fileExplorerServiceBaseUrl={remote.getGlobal(GlobalVariables.BaseUrl)}
                platformDependentServices={platformDependentServices}
            />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

ipcRenderer.addListener(GlobalVariableChannels.BaseUrl, () => {
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
