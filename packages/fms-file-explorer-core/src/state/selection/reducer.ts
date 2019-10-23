import { castArray, without } from "lodash";
import { AnyAction } from "redux";

import Annotation from "../../entity/Annotation";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    DESELECT_DISPLAY_ANNOTATION,
    DeselectDisplayAnnotationAction,
    SELECT_DISPLAY_ANNOTATION,
    SelectDisplayAnnotationAction,
} from "./actions";

export interface SelectionStateBranch {
    displayAnnotations: Annotation[];
}

export const initialState = {
    displayAnnotations: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [DESELECT_DISPLAY_ANNOTATION]: {
        accepts: (action: AnyAction): action is DeselectDisplayAnnotationAction =>
            action.type === DESELECT_DISPLAY_ANNOTATION,
        perform: (state: SelectionStateBranch, action: DeselectDisplayAnnotationAction) => ({
            ...state,
            displayAnnotations: without(state.displayAnnotations, ...castArray(action.payload)),
        }),
    },
    [SELECT_DISPLAY_ANNOTATION]: {
        accepts: (action: AnyAction): action is SelectDisplayAnnotationAction =>
            action.type === SELECT_DISPLAY_ANNOTATION,
        perform: (state: SelectionStateBranch, action: SelectDisplayAnnotationAction) => ({
            ...state,
            displayAnnotations: [...state.displayAnnotations, ...castArray(action.payload)],
        }),
    },
};

export default makeReducer<SelectionStateBranch>(actionToConfigMap, initialState);
