import "regenerator-runtime/runtime";

import FmsFileExplorer from "../../core/App";
import { createReduxStore } from "../../core/state";
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
