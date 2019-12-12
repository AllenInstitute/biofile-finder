import { makeReducer } from "@aics/redux-utils";
import { castArray, without } from "lodash";

import Annotation from "../../entity/Annotation";

import {
    DESELECT_DISPLAY_ANNOTATION,
    DESELECT_FILE,
    SELECT_DISPLAY_ANNOTATION,
    SELECT_FILE,
    SET_ANNOTATION_HIERARCHY,
} from "./actions";

export interface SelectionStateBranch {
    annotationHierarchy: Annotation[];
    displayAnnotations: Annotation[];
    selectedFiles: string[]; // file ids
}

export const initialState = {
    annotationHierarchy: [],
    displayAnnotations: [],
    selectedFiles: [], // file ids
};

export default makeReducer<SelectionStateBranch>(
    {
        [DESELECT_DISPLAY_ANNOTATION]: (state, action) => ({
            ...state,
            displayAnnotations: without(state.displayAnnotations, ...castArray(action.payload)),
        }),
        [DESELECT_FILE]: (state, action) => ({
            ...state,
            selectedFiles: without(state.selectedFiles, ...castArray(action.payload)),
        }),
        [SELECT_DISPLAY_ANNOTATION]: (state, action) => ({
            ...state,
            displayAnnotations: [...state.displayAnnotations, ...castArray(action.payload)],
        }),
        [SELECT_FILE]: (state, action) => ({
            ...state,
            selectedFiles: castArray(action.payload.file),
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,
        }),
    },
    initialState
);
