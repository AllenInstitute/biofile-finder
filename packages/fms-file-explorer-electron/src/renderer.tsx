import "regenerator-runtime/runtime";

import FmsFileExplorer, { createReduxStore } from "@aics/fms-file-explorer-core";
import { ipcRenderer, remote } from "electron";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import ApplicationInfoServiceElectron from "./services/ApplicationInfoServiceElectron";
import ExecutableEnvServiceElectron from "./services/ExecutableEnvElectron";
import FileDownloadServiceElectron from "./services/FileDownloadServiceElectron";
import FileViewerServiceElectron from "./services/FileViewerServiceElectron";
import PersistentConfigServiceElectron from "./services/PersistentConfigServiceElectron";
import NotificationServiceElectron from "./services/NotificationServiceElectron";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistedConfigKeys,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");
const { selection } = require("@aics/fms-file-explorer-core/nodejs/state");

const APP_ID = "fms-file-explorer-electron";

enum GlobalVariables {
    AllenMountPoint = "fileExplorerServiceAllenMountPoint",
    BaseUrl = "fileExplorerServiceBaseUrl",
    ImageJExecutable = "fileExplorerServiceImageJExecutable",
}

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
// https://redux.js.org/api/store#subscribelistener
store.subscribe(() => {
    const state = store.getState();
    // within the running application, store these values in `selection` state
    // then, the application at large doesn't need to have any knowledge of the existence of the PersistentConfigService
    const allenMountPoint = selection.selectors.getAllenMountPoint(state);
    const imageJExecutable = selection.selectors.getImageJExectuable(state);
    // if we wanted to,
    //    if (allenMountPoint !== persistentConfigService.get(PersistentConfig.AllenMountPoint)) {
    // ...
    //    }
    persistentConfigService.persist({
        [PersistedConfigKeys.AllenMountPoint]: allenMountPoint,
        [PersistedConfigKeys.ImageJExecutable]: imageJExecutable,
    });
});

function getGlobal(globalVariable: GlobalVariables) {
    // TODO: Use something other than global
    return remote.getGlobal(globalVariable);
}

function renderFmsFileExplorer() {
    render(
        <Provider store={store}>
            <FmsFileExplorer
                allenMountPoint={getGlobal(GlobalVariables.AllenMountPoint)}
                imageJExecutable={getGlobal(GlobalVariables.ImageJExecutable)}
                fileExplorerServiceBaseUrl={getGlobal(GlobalVariables.BaseUrl)}
                platformDependentServices={platformDependentServices}
            />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

ipcRenderer.addListener("file-explorer-service-global-variable-change", () => {
    renderFmsFileExplorer();
});

renderFmsFileExplorer();
