import { makeReducer } from "@aics/redux-utils";
import { castArray, difference, omit, without } from "lodash";

import interaction from "../interaction";
import { AnnotationName } from "../../constants";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import NumericRange from "../../entity/NumericRange";

import {
    DESELECT_DISPLAY_ANNOTATION,
    SELECT_DISPLAY_ANNOTATION,
    SET_ANNOTATION_HIERARCHY,
    SET_AVAILABLE_ANNOTATIONS,
    SET_FILE_FILTERS,
    SET_FILE_SELECTION,
    SET_OPEN_FILE_FOLDERS,
    RESIZE_COLUMN,
    RESET_COLUMN_WIDTH,
} from "./actions";

export interface SelectionStateBranch {
    annotationHierarchy: Annotation[];
    availableAnnotationsForHierarchy: string[];
    availableAnnotationsForHierarchyLoading: boolean;
    columnWidths: {
        [index: string]: number; // columnName to widthPercent mapping
    };
    displayAnnotations: Annotation[];
    filters: FileFilter[];
    openFileFolders: FileFolder[];
    selectedFileRangesByFileSet: {
        [index: string]: NumericRange[]; // FileSet::hash to list of list ranges
    };
}

export const initialState = {
    annotationHierarchy: [],
    availableAnnotationsForHierarchy: [],
    availableAnnotationsForHierarchyLoading: false,
    columnWidths: {
        [AnnotationName.FILE_NAME]: 0.4,
        [AnnotationName.KIND]: 0.2,
        [AnnotationName.TYPE]: 0.3,
        [AnnotationName.FILE_SIZE]: 0.1,
    },
    displayAnnotations: [],
    filters: [],
    openFileFolders: [],
    selectedFileRangesByFileSet: {}, // FileSet::hash to NumericRange[]
};

export default makeReducer<SelectionStateBranch>(
    {
        [SET_FILE_FILTERS]: (state, action) => ({
            ...state,
            filters: action.payload,
        }),
        [DESELECT_DISPLAY_ANNOTATION]: (state, action) => {
            const displayAnnotations = without(
                state.displayAnnotations,
                ...castArray(action.payload)
            );

            const columnWidthsToPrune = difference(
                Object.keys(state.columnWidths),
                displayAnnotations.map((annotation) => annotation.name)
            );

            return {
                ...state,
                displayAnnotations,
                columnWidths: omit(state.columnWidths, columnWidthsToPrune),
            };
        },
        [RESET_COLUMN_WIDTH]: (state, action) => ({
            ...state,
            columnWidths: omit(state.columnWidths, [action.payload]),
        }),
        [RESIZE_COLUMN]: (state, action) => ({
            ...state,
            columnWidths: {
                ...state.columnWidths,
                [action.payload.columnHeader]: action.payload.widthPercent,
            },
        }),
        [SELECT_DISPLAY_ANNOTATION]: (state, action) => {
            const displayAnnotations = action.payload.replace
                ? castArray(action.payload.annotation)
                : [...state.displayAnnotations, ...castArray(action.payload.annotation)];

            return {
                ...state,
                displayAnnotations,
            };
        },
        [SET_FILE_SELECTION]: (state, action) => ({
            ...state,
            selectedFileRangesByFileSet: action.payload,
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: true,

            // Reset file selections when annotation hierarchy changes
            selectedFileRangesByFileSet: {},
        }),
        [SET_AVAILABLE_ANNOTATIONS]: (state, action) => ({
            ...state,
            availableAnnotationsForHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: false,
        }),
        [SET_OPEN_FILE_FOLDERS]: (state, action) => ({
            ...state,
            openFileFolders: action.payload,
        }),
        [interaction.actions.SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state) => ({
            ...state,

            // Reset file selections when pointed at a new backend
            selectedFileRangesByFileSet: {},
        }),
    },
    initialState
);
