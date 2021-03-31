import { configureStore, mergeState } from "@aics/redux-utils";
import axios, { AxiosInstance } from "axios";
import { combineReducers, AnyAction, Middleware } from "redux";
import { createLogicMiddleware } from "redux-logic";

import { PersistedConfig, PersistedConfigKeys } from "../services/PersistentConfigService";

import interaction, { InteractionStateBranch } from "./interaction";
import metadata, { MetadataStateBranch } from "./metadata";
import selection, { SelectionStateBranch } from "./selection";

export { interaction, metadata, selection };

// -- STATE
export interface State {
    interaction: InteractionStateBranch;
    metadata: MetadataStateBranch;
    selection: SelectionStateBranch;
}

export const initialState: State = Object.freeze({
    interaction: interaction.initialState,
    metadata: metadata.initialState,
    selection: selection.initialState,
});

// -- REDUCER
export const reducer = combineReducers({
    interaction: interaction.reducer,
    metadata: metadata.reducer,
    selection: selection.reducer,
});

// --- MIDDLEWARE --
export interface ReduxLogicDeps {
    action: AnyAction;
    baseApiUrl: string;
    httpClient: AxiosInstance;
    getState: () => State;
    ctx?: any;
}

export const reduxLogicDependencies: Partial<ReduxLogicDeps> = {
    httpClient: axios,
};

export const reduxLogics = [...metadata.logics, ...selection.logics, ...interaction.logics];

const logicMiddleware = createLogicMiddleware(reduxLogics);
logicMiddleware.addDeps(reduxLogicDependencies);

export const middleware = [logicMiddleware];

interface CreateStoreOptions {
    middleware?: Middleware[];
    persistedConfig?: PersistedConfig;
}
export function createReduxStore(options: CreateStoreOptions = {}) {
    const { persistedConfig } = options;
    let userSelectedApplications;
    if (persistedConfig) {
        userSelectedApplications = persistedConfig[PersistedConfigKeys.UserSelectedApplications];
        // This is included for backwards compatibility for versions <4.2.0
        // so that users do not have to reselect their ImageJ/Fiji executable
        // location just because of our persisted storage management
        if (persistedConfig[PersistedConfigKeys.ImageJExecutable]) {
            userSelectedApplications = [
                ...(userSelectedApplications || []),
                {
                    name: "ImageJ/Fiji",
                    filePath: persistedConfig[PersistedConfigKeys.ImageJExecutable],
                    defaultFileKinds: [],
                },
            ];
        }
    }
    const preloadedState: State = mergeState(initialState, {
        interaction: {
            allenMountPoint:
                persistedConfig && persistedConfig[PersistedConfigKeys.AllenMountPoint],
            csvColumns: persistedConfig && persistedConfig[PersistedConfigKeys.CsvColumns],
            userSelectedApplications,
        },
    });
    return configureStore<State>({
        middleware: [...(options.middleware || []), ...(middleware || [])],
        preloadedState,
        reducer,
    });
}
