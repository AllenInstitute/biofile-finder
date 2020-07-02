import { makeReducer } from "@aics/redux-utils";
import { castArray, compact, find, omit, without } from "lodash";

import interaction from "../interaction";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../metadata/reducer";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import NumericRange from "../../entity/NumericRange";

import {
    DESELECT_DISPLAY_ANNOTATION,
    SELECT_DISPLAY_ANNOTATION,
    SET_ANNOTATION_HIERARCHY,
    SET_AVAILABLE_ANNOTATIONS,
    SET_FILE_FILTERS,
    SET_FILE_SELECTION,
} from "./actions";

export interface SelectionStateBranch {
    annotationHierarchy: Annotation[];
    availableAnnotationsForHierarchy: string[];
    availableAnnotationsForHierarchyLoading: boolean;
    displayAnnotations: Annotation[];
    filters: FileFilter[];
    selectedFileIndicesByFileSet: {
        [index: string]: NumericRange[]; // FileSet::hash to list of list indices
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
    availableAnnotationsForHierarchy: [],
    availableAnnotationsForHierarchyLoading: false,
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
        [SET_FILE_SELECTION]: (state, action) => ({
            ...state,
            selectedFileIndicesByFileSet: action.payload.selection.length
                ? {
                      ...state.selectedFileIndicesByFileSet,
                      [action.payload.correspondingFileSet]: action.payload.selection,
                  }
                : omit(state.selectedFileIndicesByFileSet, [action.payload.correspondingFileSet]),
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: true,

            // Reset file selections when annotation hierarchy changes
            selectedFileIndicesByFileSet: {},
        }),
        [SET_AVAILABLE_ANNOTATIONS]: (state, action) => ({
            ...state,
            availableAnnotationsForHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: false,
        }),
        [interaction.actions.SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state) => ({
            ...state,

            // Reset file selections when pointed at a new backend
            selectedFileIndicesByFileSet: {},
        }),
    },
    initialState
);
