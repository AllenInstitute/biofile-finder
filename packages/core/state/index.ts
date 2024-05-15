import { configureStore, mergeState } from "@aics/redux-utils";
import axios, { AxiosInstance } from "axios";
import { combineReducers, AnyAction, Middleware } from "redux";
import { createLogicMiddleware } from "redux-logic";

import interaction, { InteractionStateBranch } from "./interaction";
import metadata, { MetadataStateBranch } from "./metadata";
import selection, { SelectionStateBranch } from "./selection";
import { PlatformDependentServices } from "../services";
import { PersistedConfig, PersistedConfigKeys } from "../services/PersistentConfigService";
import Annotation from "../entity/Annotation";

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
    platformDependentServices?: Partial<PlatformDependentServices>;
}
export function createReduxStore(options: CreateStoreOptions = {}) {
    const { persistedConfig } = options;
    const queries = persistedConfig?.[PersistedConfigKeys.Queries]?.length
        ? persistedConfig?.[PersistedConfigKeys.Queries]
        : [];
    const rawDisplayAnnotations =
        persistedConfig && persistedConfig[PersistedConfigKeys.DisplayAnnotations];
    const displayAnnotations = rawDisplayAnnotations
        ? rawDisplayAnnotations.map((annotation) => new Annotation(annotation))
        : [];
    const preloadedState: State = mergeState(initialState, {
        interaction: {
            platformDependentServices: {
                ...initialState.interaction.platformDependentServices,
                ...options.platformDependentServices
            },
            csvColumns: persistedConfig?.[PersistedConfigKeys.CsvColumns],
            hasUsedApplicationBefore:
                persistedConfig?.[PersistedConfigKeys.HasUsedApplicationBefore],
            userSelectedApplications:
                persistedConfig?.[PersistedConfigKeys.UserSelectedApplications],
        },
        selection: {
            displayAnnotations,
            queries,
        },
    });
    return configureStore<State>({
        middleware: [...(options.middleware || []), ...(middleware || [])],
        preloadedState,
        reducer,
    });
}
