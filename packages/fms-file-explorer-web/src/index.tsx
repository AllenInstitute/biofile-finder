import "regenerator-runtime/runtime";

import FmsFileExplorer, { createReduxStore } from "@aics/fms-file-explorer-core";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

const APP_ID = "fms-file-explorer-web";

render(
    <Provider store={createReduxStore()}>
        <FmsFileExplorer />
    </Provider>,
    document.getElementById(APP_ID)
);
