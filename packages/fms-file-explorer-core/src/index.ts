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
import { default as _FileDownloadService } from "./services/FileDownloadService";
export type FileDownloadService = _FileDownloadService;
export { CancellationToken } from "./services/FileDownloadService";

import { default as _ApplicationInfoService } from "./services/ApplicationInfoService";
export type ApplicationInfoService = _ApplicationInfoService;

export { default } from "./App";
