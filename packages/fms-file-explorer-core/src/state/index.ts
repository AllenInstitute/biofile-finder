import axios, { AxiosInstance } from "axios";
import { combineReducers, AnyAction } from "redux";
import { createLogicMiddleware } from "redux-logic";

import interaction, { InteractionStateBranch } from "./interaction";
import metadata, { MetadataStateBranch } from "./metadata";
import persistent, { PersistentStateBranch } from "./persistent";
import selection, { SelectionStateBranch } from "./selection";

export { interaction, metadata, persistent, selection };

// -- STATE
export interface State {
    interaction: InteractionStateBranch;
    metadata: MetadataStateBranch;
    persistent: PersistentStateBranch;
    selection: SelectionStateBranch;
}

export const initialState: State = Object.freeze({
    interaction: interaction.initialState,
    metadata: metadata.initialState,
    persistent: persistent.initialState,
    selection: selection.initialState,
});

// -- REDUCER
export const reducer = combineReducers({
    interaction: interaction.reducer,
    metadata: metadata.reducer,
    persistent: persistent.reducer,
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

export const reduxLogics = [
    ...metadata.logics,
    ...selection.logics,
    ...interaction.logics,
    ...persistent.logics,
];

const logicMiddleware = createLogicMiddleware(reduxLogics);
logicMiddleware.addDeps(reduxLogicDependencies);

export const middleware = [logicMiddleware];
