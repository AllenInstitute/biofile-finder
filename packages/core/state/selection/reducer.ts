import { makeReducer } from "@aics/redux-utils";
import { castArray, difference, omit, without } from "lodash";

import interaction from "../interaction";
import { AnnotationName } from "../../constants";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";

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
    SORT_COLUMN,
    SET_SORT_COLUMN,
    SET_FILE_SET_SOURCE,
} from "./actions";
import FileSort, { SortOrder } from "../../entity/FileSort";

export interface SelectionStateBranch {
    annotationHierarchy: Annotation[];
    availableAnnotationsForHierarchy: string[];
    availableAnnotationsForHierarchyLoading: boolean;
    columnWidths: {
        [index: string]: number; // columnName to widthPercent mapping
    };
    displayAnnotations: Annotation[];
    fileSelection: FileSelection;
    fileSetSourceId?: string; // DatasetID
    filters: FileFilter[];
    openFileFolders: FileFolder[];
    sortColumn?: FileSort;
}

export const initialState = {
    annotationHierarchy: [],
    availableAnnotationsForHierarchy: [],
    availableAnnotationsForHierarchyLoading: false,
    columnWidths: {
        [AnnotationName.FILE_NAME]: 0.4,
        [AnnotationName.KIND]: 0.2,
        [AnnotationName.TYPE]: 0.25,
        [AnnotationName.FILE_SIZE]: 0.15,
    },
    displayAnnotations: [],
    fileSelection: new FileSelection(),
    filters: [],
    openFileFolders: [],
    sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
};

export default makeReducer<SelectionStateBranch>(
    {
        [SET_FILE_FILTERS]: (state, action) => ({
            ...state,
            filters: action.payload,

            // Reset file selections when file filters change
            fileSelection: new FileSelection(),
        }),
        [SORT_COLUMN]: (state, action) => {
            if (state.sortColumn?.annotationName === action.payload) {
                // If already sorting by this column descending
                // try sorting ascending
                if (state.sortColumn?.order === SortOrder.DESC) {
                    return {
                        ...state,
                        sortColumn: new FileSort(action.payload, SortOrder.ASC),
                    };
                }

                // Otherwise already sorted ascending so remove sort
                return {
                    ...state,
                    sortColumn: undefined,
                };
            }

            // Default to sorting descending on initial sort
            return {
                ...state,
                sortColumn: new FileSort(action.payload, SortOrder.DESC),
            };
        },
        [SET_FILE_SET_SOURCE]: (state, action) => ({
            ...state,
            fileSetSourceId: action.payload,
        }),
        [SET_SORT_COLUMN]: (state, action) => ({
            ...state,
            sortColumn: action.payload,
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
        [interaction.actions.REFRESH]: (state) => ({
            ...state,
            availableAnnotationsForHierarchyLoading: true,
            fileSelection: new FileSelection(),
        }),
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
            fileSelection: action.payload,
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: true,

            // Reset file selections when annotation hierarchy changes
            fileSelection: new FileSelection(),
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
            fileSelection: new FileSelection(),
        }),
    },
    initialState
);
