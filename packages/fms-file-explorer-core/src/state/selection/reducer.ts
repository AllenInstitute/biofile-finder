import { makeReducer } from "@aics/redux-utils";
import { castArray, compact, find, without } from "lodash";

import { TOP_LEVEL_FILE_ANNOTATIONS } from "../metadata/reducer";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";

import {
    DESELECT_DISPLAY_ANNOTATION,
    SELECT_DISPLAY_ANNOTATION,
    SELECT_FILE,
    SET_ANNOTATION_HIERARCHY,
    SET_FILE_FILTERS,
} from "./actions";

export interface SelectionStateBranch {
    annotationHierarchy: Annotation[];
    displayAnnotations: Annotation[];
    filters: FileFilter[];
    selectedFileIndicesByFileSet: {
        [index: string]: number[]; // FileSet::hash to list of list indices
    };
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
    filters: [],
    selectedFileIndicesByFileSet: {}, // FileSet::hash to str[]
};

export default makeReducer<SelectionStateBranch>(
    {
        [SET_FILE_FILTERS]: (state, action) => ({
            ...state,
            filters: action.payload,
        }),
        [DESELECT_DISPLAY_ANNOTATION]: (state, action) => ({
            ...state,
            displayAnnotations: without(state.displayAnnotations, ...castArray(action.payload)),
        }),
        [SELECT_DISPLAY_ANNOTATION]: (state, action) => ({
            ...state,
            displayAnnotations: [...state.displayAnnotations, ...castArray(action.payload)],
        }),
        [SELECT_FILE]: (state, action) => ({
            ...state,
            selectedFileIndicesByFileSet: {
                ...state.selectedFileIndicesByFileSet,
                [action.payload.correspondingFileSet]: action.payload.fileIndex,
            },
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,
        }),
    },
    initialState
);
