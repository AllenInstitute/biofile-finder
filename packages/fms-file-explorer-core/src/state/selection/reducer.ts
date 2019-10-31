import { castArray, without } from "lodash";
import { AnyAction } from "redux";

import Annotation from "../../entity/Annotation";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    DESELECT_DISPLAY_ANNOTATION,
    DESELECT_FILE,
    DeselectDisplayAnnotationAction,
    DeselectFileAction,
    SELECT_DISPLAY_ANNOTATION,
    SELECT_FILE,
    SelectDisplayAnnotationAction,
    SelectFileAction,
} from "./actions";

export interface SelectionStateBranch {
    displayAnnotations: Annotation[];
    selectedFiles: string[]; // file ids
}

export const initialState = {
    displayAnnotations: [],
    selectedFiles: [], // file ids
};

const actionToConfigMap: TypeToDescriptionMap = {
    [DESELECT_DISPLAY_ANNOTATION]: {
        accepts: (action: AnyAction): action is DeselectDisplayAnnotationAction =>
            action.type === DESELECT_DISPLAY_ANNOTATION,
        perform: (
            state: SelectionStateBranch,
            action: DeselectDisplayAnnotationAction
        ): SelectionStateBranch => ({
            ...state,
            displayAnnotations: without(state.displayAnnotations, ...castArray(action.payload)),
        }),
    },
    [DESELECT_FILE]: {
        accepts: (action: AnyAction): action is DeselectFileAction => action.type === DESELECT_FILE,
        perform: (
            state: SelectionStateBranch,
            action: DeselectFileAction
        ): SelectionStateBranch => ({
            ...state,
            selectedFiles: without(state.selectedFiles, ...castArray(action.payload)),
        }),
    },
    [SELECT_DISPLAY_ANNOTATION]: {
        accepts: (action: AnyAction): action is SelectDisplayAnnotationAction =>
            action.type === SELECT_DISPLAY_ANNOTATION,
        perform: (
            state: SelectionStateBranch,
            action: SelectDisplayAnnotationAction
        ): SelectionStateBranch => ({
            ...state,
            displayAnnotations: [...state.displayAnnotations, ...castArray(action.payload)],
        }),
    },
    [SELECT_FILE]: {
        accepts: (action: AnyAction): action is SelectFileAction => action.type === SELECT_FILE,
        perform: (state: SelectionStateBranch, action: SelectFileAction): SelectionStateBranch => ({
            ...state,
            selectedFiles: castArray(action.payload.file),
        }),
    },
};

export default makeReducer<SelectionStateBranch>(actionToConfigMap, initialState);
