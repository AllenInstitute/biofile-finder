import axios, { AxiosInstance } from "axios";
import { applyMiddleware, combineReducers, createStore, Middleware, Store } from "redux";
import { createLogicMiddleware, LogicMiddleware } from "redux-logic";

import { enableBatching, initialState, metadata, selection, State } from "../";

import ActionTracker, { Actions } from "./ActionTracker";
import mockHttpClient, { ResponseStub } from "./mock-http-client";

export interface ReduxLogicDependencies {
    httpClient?: AxiosInstance;
}

const defaultReduxLogicDeps = {
    httpClient: axios,
};

const reducers = {
    metadata: metadata.reducer,
    selection: selection.reducer,
};

const logics = [...metadata.logics, ...selection.logics];

export default function createMockReduxStore(
    config: {
        mockState?: State;
        reduxLogicDependencies?: ReduxLogicDependencies;
        responseStubs?: ResponseStub | ResponseStub[];
    } = {}
): [Store, LogicMiddleware, Actions] {
    const {
        mockState = initialState,
        reduxLogicDependencies = defaultReduxLogicDeps,
        responseStubs = [],
    } = config;

    // redux-logic middleware
    const logicMiddleware = createLogicMiddleware(logics);
    reduxLogicDependencies.httpClient = mockHttpClient(responseStubs);
    logicMiddleware.addDeps(reduxLogicDependencies);

    // action tracking middleware
    const actionTracker = new ActionTracker();
    const trackActionsMiddleware: Middleware = () => (next) => (action) => {
        actionTracker.track(action);
        return next(action);
    };
    const middleware = applyMiddleware(logicMiddleware, trackActionsMiddleware);
    const rootReducer = enableBatching<State>(combineReducers(reducers), initialState);

    return [
        createStore(rootReducer, mockState, middleware),
        logicMiddleware,
        actionTracker.actions,
    ];
}
