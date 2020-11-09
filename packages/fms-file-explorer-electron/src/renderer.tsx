import "regenerator-runtime/runtime";

import FmsFileExplorer, { createReduxStore } from "@aics/fms-file-explorer-core";
import { ipcRenderer, remote } from "electron";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import ApplicationInfoServiceElectron from "./services/ApplicationInfoServiceElectron";
import ExecutionEnvServiceElectron from "./services/ExecutionEnvServiceElectron";
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
    executionEnvService: new ExecutionEnvServiceElectron(notificationService),
    fileDownloadService: new FileDownloadServiceElectron(),
    fileViewerService: new FileViewerServiceElectron(notificationService),
    persistentConfigService,
};

const store = createReduxStore(persistentConfigService.getAll());
// https://redux.js.org/api/store#subscribelistener
store.subscribe(() => {
    const state = store.getState();
    const allenMountPoint = interaction.selectors.getAllenMountPoint(state);
    const csvColumns = interaction.selectors.getCsvColumns(state);
    const imageJExecutable = interaction.selectors.getImageJExecutable(state);
    const appState = {
        [PersistedConfigKeys.AllenMountPoint]: allenMountPoint,
        [PersistedConfigKeys.CsvColumns]: csvColumns,
        [PersistedConfigKeys.ImageJExecutable]: imageJExecutable,
    };
    if (JSON.stringify(appState) !== JSON.stringify(persistentConfigService.getAll())) {
        persistentConfigService.persist({
            [PersistedConfigKeys.AllenMountPoint]: allenMountPoint,
            [PersistedConfigKeys.CsvColumns]: csvColumns,
            [PersistedConfigKeys.ImageJExecutable]: imageJExecutable,
        });
    }
});

function renderFmsFileExplorer() {
    render(
        <Provider store={store}>
            <FmsFileExplorer
                allenMountPoint={global.fileExplorerServiceAllenMountPoint}
                imageJExecutable={global.fileExplorerServiceImageJExecutable}
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
