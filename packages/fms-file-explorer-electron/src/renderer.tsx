import "regenerator-runtime/runtime";

import FmsFileExplorer, { createReduxStore } from "@aics/fms-file-explorer-core";
import { ipcRenderer, remote } from "electron";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import { ConnectionConfig } from "./main/menu/data-source";

const APP_ID = "fms-file-explorer-electron";

const store = createReduxStore();

function renderFmsFileExplorer(fileExplorerServiceConnectionConfig: ConnectionConfig) {
    const { protocol, host, port } = fileExplorerServiceConnectionConfig;

    const key = `${protocol}://${host}:${port}`;
    render(
        <Provider store={store}>
            <FmsFileExplorer
                key={key} // re-render when the FES connection changes
                fileExplorerServiceProtocol={protocol}
                fileExplorerServiceHost={host}
                fileExplorerServicePort={port}
            />
        </Provider>,
        document.getElementById(APP_ID)
    );
}

function getFileExplorerServiceConnection() {
    return remote.getGlobal("fileExplorerServiceConnection");
}

ipcRenderer.addListener("file-explorer-service-connection-change", () => {
    renderFmsFileExplorer(getFileExplorerServiceConnection());
});

renderFmsFileExplorer(getFileExplorerServiceConnection());
