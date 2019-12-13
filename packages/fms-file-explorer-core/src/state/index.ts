import { enableBatching } from "@aics/redux-utils";
import axios, { AxiosInstance } from "axios";
import { combineReducers, AnyAction } from "redux";
import { createLogicMiddleware } from "redux-logic";

import metadata, { MetadataStateBranch } from "./metadata";
import selection, { SelectionStateBranch } from "./selection";

export { metadata, selection };

// -- STATE
export interface State {
    metadata: MetadataStateBranch;
    selection: SelectionStateBranch;
}

export const initialState: State = Object.freeze({
    metadata: metadata.initialState,
    selection: selection.initialState,
});

// -- REDUCER
export const reducer = enableBatching<State>(
    combineReducers({
        metadata: metadata.reducer,
        selection: selection.reducer,
    }),
    initialState
);

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

export const reduxLogics = [...metadata.logics, ...selection.logics];

const logicMiddleware = createLogicMiddleware(reduxLogics);
logicMiddleware.addDeps(reduxLogicDependencies);

export const middleware = [logicMiddleware];
