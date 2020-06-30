import { makeReducer } from "@aics/redux-utils";
import { castArray, compact, find, omit, without } from "lodash";

import interaction from "../interaction";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../metadata/reducer";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";

import {
    DESELECT_DISPLAY_ANNOTATION,
    SELECT_DISPLAY_ANNOTATION,
    SELECT_FILE,
    SET_ANNOTATION_HIERARCHY,
    SET_FILE_FILTERS,
    SET_COMBINABLE_ANNOTATIONS,
} from "./actions";

export interface SelectionStateBranch {
    annotationHierarchy: Annotation[];
    combinableAnnotationsForHierarchy: string[];
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
    combinableAnnotationsForHierarchy: [],
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
            selectedFileIndicesByFileSet: action.payload.fileIndex.length
                ? {
                      ...state.selectedFileIndicesByFileSet,
                      [action.payload.correspondingFileSet]: action.payload.fileIndex,
                  }
                : omit(state.selectedFileIndicesByFileSet, [action.payload.correspondingFileSet]),
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,

            // Reset file selections when annotation hierarchy changes
            selectedFileIndicesByFileSet: {},
        }),
        [SET_COMBINABLE_ANNOTATIONS]: (state, action) => ({
            ...state,
            combinableAnnotationsForHierarchy: action.payload,
        }),
        [interaction.actions.SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state) => ({
            ...state,

            // Reset file selections when pointed at a new backend
            selectedFileIndicesByFileSet: {},
        }),
    },
    initialState
);
