import { AnyAction, Reducer } from "redux";

import { APP_ID } from "../constants";

import { BatchedAction, TypeToDescriptionMap } from "./types";

export function makeConstant(associatedReducer: string, actionType: string) {
    return `${APP_ID}/${associatedReducer.toUpperCase()}/${actionType.toUpperCase()}`;
}

export function makeReducer<S>(
    typeToDescriptionMap: TypeToDescriptionMap,
    initialState: S
): Reducer<S> {
    return (state: S = initialState, action: AnyAction) => {
        const description = typeToDescriptionMap[action.type];
        if (!description) {
            return state;
        }

        if (description.accepts(action)) {
            return description.perform(state, action);
        }

        return state;
    };
}

const BATCH_ACTIONS = makeConstant("batch", "batch-actions");

export function batchActions(actions: AnyAction[], type: string = BATCH_ACTIONS): BatchedAction {
    return { type, batch: true, payload: actions };
}

function actionIsBatched(action: AnyAction): action is BatchedAction {
    return action && action.batch && Array.isArray(action.payload);
}

export function enableBatching<S>(reducer: Reducer<S>, initialState: S): Reducer<S> {
    return function batchingReducer(state: S = initialState, action: AnyAction): S {
        if (actionIsBatched(action)) {
            return action.payload.reduce(batchingReducer, state);
        }
        return reducer(state, action);
    };
}
