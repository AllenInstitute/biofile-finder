/**
 * State management and testing utilities for react-redux
 * Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
 */
import axios, { AxiosInstance } from "axios";
import { isArray, mergeWith } from "lodash";
import type { AnyAction, Middleware, Reducer } from "redux";
import { applyMiddleware, createStore, Store } from "redux";

import ActionTracker, { Actions as _Actions } from "./ActionTracker";
import createMockHttpClient, { ResponseStub as _ResponseStub } from "./mock-http-client";
import configureMockStore, {
    ConfigureMockStoreConfig as _ConfigureMockStoreConfig,
} from "./mock-store";

export type Actions = _Actions;
export { ActionTracker };

export type ResponseStub = _ResponseStub;
export { createMockHttpClient };

export type ConfigureMockStoreConfig<State> = _ConfigureMockStoreConfig<State>;
export { configureMockStore };

type PartialDeep<T> = {
    [P in keyof T]?: PartialDeep<T[P]>;
};

/**
 * A function that accepts Redux state, or some slice of it, and a Redux action and returns Redux state. Required to be a pure function and to treat state as immutable.
 *
 * See [[makeReducer]] for an example.
 */
export interface ActionHandler<State = any> {
    (state: State, action: any): State;
}

/**
 * A mapping between action types and [[ActionHandler]]s.
 *
 * See [[makeReducer]] for an example.
 */
export interface ActionTypeToHandlerMap<State = any> {
    [actionType: string]: ActionHandler<State>;
}

export interface ReduxLogicDependencies {
    httpClient?: AxiosInstance;
}

export interface ConfigureStoreConfig<State> {
    middleware?: Middleware[];
    preloadedState?: State;
    reducer: Reducer;
}

export const defaultReduxLogicDeps = Object.freeze({
    httpClient: axios,
});

/**
 * Extremely thin wrapper around Redux's [createStore](https://redux.js.org/api/createstore).
 */
export function configureStore<State>(config: ConfigureStoreConfig<State>): Store {
    const { middleware = [], preloadedState, reducer } = config;

    const enhancer = applyMiddleware(...middleware);
    if (preloadedState) {
        return createStore(reducer, preloadedState, enhancer);
    }
    return createStore(reducer, enhancer);
}

/**
 * Simple utility to namespace constants used as action types.
 */
export function makeConstant(associatedReducer: string, actionType: string) {
    return `${associatedReducer.toUpperCase()}/${actionType.toUpperCase()}`;
}

/**
 * Utility to turn an [[ActionTypeToHandlerMap]] into a reducer that can be provided to Redux's createStore.
 *
 * Example:
 *
 * const initialState = {
 *     foo: 123,
 * };
 *
 * const actionHandler = (state, action) => {
 *     return {
 *          ...state,
 *          foo: action.payload,
 *     };
 * }
 *
 * const actionTypeToHandlerMap = {
 *     FOO: actionHandler,
 * }
 *
 * const reducer = makeReducer(actionTypeToHandlerMap, initialState);
 */
export function makeReducer<State>(
    actionTypeToHandlerMap: ActionTypeToHandlerMap<State>,
    initialState: State
): Reducer<State> {
    return (currentState: State = initialState, action: AnyAction) => {
        const actionHandler = actionTypeToHandlerMap[action.type];

        // default case: the action type of the given action is not handled by this reducer, so return current state
        if (!actionHandler) {
            return currentState;
        }

        // new state is a function of the current state and the given action, run through the action's handler
        return actionHandler(currentState, action);
    };
}

/**
 * Fundamentally a "mergeDeep" utility that can be used to apply patch changes to a Redux initial state tree. Particularly useful in testing.
 *
 * Example:
 * ```typescript
 *
 * import { initialState } from "../some/where";
 *
 * const stateToUseInATest = mergeState(initialState, {
 *     metadata: {
 *         annotations: map(annotationsJson, (annotation) => new Annotation(annotation)),
 *     },
 * });
 *
 * // ...
 * ```
 */
export function mergeState<State = Record<string, unknown>>(
    initial: State,
    src: PartialDeep<State>
): State {
    return mergeWith({}, initial, src, (objValue, srcValue) => {
        if (isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    });
}
