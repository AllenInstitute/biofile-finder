import { configureStore, mergeState } from "@aics/redux-utils";

import {
    default as _PersistentConfigService,
    PersistedConfig as _PersistedConfig,
    PersistedConfigKeys,
} from "./services/PersistentConfigService";
import { middleware, reducer, initialState, State } from "./state";

export function createReduxStore(persistedConfig?: PersistedConfig) {
    const preloadedState: State = mergeState(initialState, {
        interaction: {
            allenMountPoint:
                persistedConfig && persistedConfig[PersistedConfigKeys.AllenMountPoint],
            csvColumns: persistedConfig && persistedConfig[PersistedConfigKeys.CsvColumns],
            imageJExecutable:
                persistedConfig && persistedConfig[PersistedConfigKeys.ImageJExecutable],
        },
    });
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

import { default as _ExecutionEnvService } from "./services/ExecutionEnvService";
export type ExecutionEnvService = _ExecutionEnvService;
export { ExecutableEnvCancellationToken } from "./services/ExecutionEnvService";

import { default as _FileViewerService } from "./services/FileViewerService";
export type FileViewerService = _FileViewerService;
export { FileViewerCancellationToken } from "./services/FileViewerService";

export type PersistentConfigService = _PersistentConfigService;
export type PersistedConfig = _PersistedConfig;
export { PersistedConfigKeys } from "./services/PersistentConfigService";

export { default } from "./App";
