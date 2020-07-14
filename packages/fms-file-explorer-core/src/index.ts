import { configureStore } from "@aics/redux-utils";

import { middleware, reducer, State } from "./state";

export function createReduxStore(preloadedState?: State) {
    return configureStore<State>({
        middleware,
        preloadedState,
        reducer,
    });
}

// interfaces for services that can be differentially implemented in either the electron or web versions
import FileDownloadService, { CancellationToken } from "./services/FileDownloadService";
export { FileDownloadService, CancellationToken };

export { default } from "./App";
