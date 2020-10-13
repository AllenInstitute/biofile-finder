import "regenerator-runtime/runtime";

import FmsFileExplorer, { createReduxStore } from "@aics/fms-file-explorer-core";
import { ipcRenderer, remote } from "electron";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import ApplicationInfoServiceElectron from "./services/ApplicationInfoServiceElectron";
import FileDownloadServiceElectron from "./services/FileDownloadServiceElectron";
import FileViewerServiceElectron from "./services/FileViewerServiceElectron";
import PersistentConfigServiceElectron from "./services/PersistentConfigServiceElectron";

const APP_ID = "fms-file-explorer-electron";

const store = createReduxStore();

const persistentConfigService = new PersistentConfigServiceElectron();
const platformDependentServices = {
    applicationInfoService: new ApplicationInfoServiceElectron(),
    fileDownloadService: new FileDownloadServiceElectron(),
    fileViewerService: new FileViewerServiceElectron(persistentConfigService),
    persistentConfigService,
};

function renderFmsFileExplorer(fileExplorerServiceBaseUrl: string) {
    render(
        <Provider store={store}>
            <FmsFileExplorer
                applicationVersion={remote.app.getVersion()}
                fileExplorerServiceBaseUrl={fileExplorerServiceBaseUrl}
                platformDependentServices={platformDependentServices}
            />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

function getFileExplorerServiceBaseUrl() {
    return remote.getGlobal("fileExplorerServiceBaseUrl");
}

ipcRenderer.addListener("file-explorer-service-connection-change", () => {
    renderFmsFileExplorer(getFileExplorerServiceBaseUrl());
});

renderFmsFileExplorer(getFileExplorerServiceBaseUrl());
