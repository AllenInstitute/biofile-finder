import "regenerator-runtime/runtime";

import FmsFileExplorer, { createReduxStore } from "@aics/fms-file-explorer-core";
import { ipcRenderer, remote } from "electron";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

const APP_ID = "fms-file-explorer-electron";

const store = createReduxStore();

function renderFmsFileExplorer(fileExplorerServiceBaseUrl: string) {
    render(
        <Provider store={store}>
            <FmsFileExplorer fileExplorerServiceBaseUrl={fileExplorerServiceBaseUrl} />
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
