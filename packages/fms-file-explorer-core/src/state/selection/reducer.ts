import { makeReducer } from "@aics/redux-utils";
import { castArray, compact, find, without } from "lodash";

import { TOP_LEVEL_FILE_ANNOTATIONS } from "../metadata/reducer";
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

const DEFAULT_DISPLAY_ANNOTATIONS = compact([
    find(TOP_LEVEL_FILE_ANNOTATIONS, (annotation) => annotation.name === "fileName"),
    find(TOP_LEVEL_FILE_ANNOTATIONS, (annotation) => annotation.name === "uploaded"),
    find(TOP_LEVEL_FILE_ANNOTATIONS, (annotation) => annotation.name === "uploadedBy"),
    find(TOP_LEVEL_FILE_ANNOTATIONS, (annotation) => annotation.name === "fileSize"),
]);

export const initialState = {
    annotationHierarchy: [],
    displayAnnotations: [...DEFAULT_DISPLAY_ANNOTATIONS],
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
