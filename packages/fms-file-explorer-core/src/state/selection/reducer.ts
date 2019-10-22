import { castArray, without } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import { DESELECT_FILE, DeselectFileAction, SELECT_FILE, SelectFileAction } from "./actions";

export interface SelectionStateBranch {
    files: string[];
}

export const initialState = {
    files: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [DESELECT_FILE]: {
        accepts: (action: AnyAction): action is DeselectFileAction => action.type === DESELECT_FILE,
        perform: (state: SelectionStateBranch, action: DeselectFileAction) => ({
            ...state,
            files: without(state.files, ...castArray(action.payload)),
        }),
    },
    [SELECT_FILE]: {
        accepts: (action: AnyAction): action is SelectFileAction => action.type === SELECT_FILE,
        perform: (state: SelectionStateBranch, action: SelectFileAction) => ({
            ...state,
            files: [...state.files, ...castArray(action.payload)],
        }),
    },
};

export default makeReducer<SelectionStateBranch>(actionToConfigMap, initialState);
