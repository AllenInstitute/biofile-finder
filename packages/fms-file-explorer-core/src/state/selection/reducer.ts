import { castArray, without } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import { DESELECT_FILE, SELECT_FILE, SELECT_METADATA } from "./constants";
import {
    DeselectFileAction,
    SelectFileAction,
    SelectionStateBranch,
    SelectMetadataAction,
} from "./types";

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
    [SELECT_METADATA]: {
        accepts: (action: AnyAction): action is SelectMetadataAction =>
            action.type === SELECT_METADATA,
        perform: (state: SelectionStateBranch, action: SelectMetadataAction) => ({
            ...state,
            [action.key]: action.payload,
        }),
    },
};

export default makeReducer<SelectionStateBranch>(actionToConfigMap, initialState);
