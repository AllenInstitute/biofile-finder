import { makeReducer } from "@aics/redux-utils";
import { castArray, omit } from "lodash";

import interaction from "../interaction";
import { THUMBNAIL_SIZE_TO_NUM_COLUMNS } from "../../constants";
import Annotation, { AnnotationName } from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";

import {
    SET_DISPLAY_ANNOTATIONS,
    SET_ANNOTATION_HIERARCHY,
    SET_AVAILABLE_ANNOTATIONS,
    SET_FILE_FILTERS,
    SET_FILE_SELECTION,
    SET_OPEN_FILE_FOLDERS,
    RESIZE_COLUMN,
    RESET_COLUMN_WIDTH,
    SORT_COLUMN,
    SET_SORT_COLUMN,
    CHANGE_COLLECTION,
    SELECT_TUTORIAL,
    ADJUST_GLOBAL_FONT_SIZE,
    Query,
    ADD_QUERY,
    CHANGE_QUERY,
    SET_QUERIES,
    SetQueries,
    ChangeQuery,
    SET_FILE_THUMBNAIL_VIEW,
    SET_FILE_GRID_COLUMN_COUNT,
} from "./actions";
import FileSort, { SortOrder } from "../../entity/FileSort";
import Tutorial from "../../entity/Tutorial";
import { Dataset } from "../../services/DatasetService";

export interface SelectionStateBranch {
    annotationHierarchy: string[];
    availableAnnotationsForHierarchy: string[];
    availableAnnotationsForHierarchyLoading: boolean;
    collection?: Dataset;
    columnWidths: {
        [index: string]: number; // columnName to widthPercent mapping
    };
    displayAnnotations: Annotation[];
    fileGridColumnCount: number;
    fileSelection: FileSelection;
    filters: FileFilter[];
    isDarkTheme: boolean;
    openFileFolders: FileFolder[];
    recentAnnotations: string[];
    selectedQuery?: Query;
    shouldDisplaySmallFont: boolean;
    shouldDisplayThumbnailView: boolean;
    sortColumn?: FileSort;
    queries: Query[];
    tutorial?: Tutorial;
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
    isDarkTheme: true,
    fileGridColumnCount: THUMBNAIL_SIZE_TO_NUM_COLUMNS.LARGE,
    fileSelection: new FileSelection(),
    filters: [],
    openFileFolders: [],
    recentAnnotations: [],
    shouldDisplaySmallFont: false,
    queries: [],
    shouldDisplayThumbnailView: false,
};

export default makeReducer<SelectionStateBranch>(
    {
        [SELECT_TUTORIAL]: (state, action) => ({
            ...state,
            tutorial: action.payload,
        }),
        [ADJUST_GLOBAL_FONT_SIZE]: (state, action) => ({
            ...state,
            shouldDisplaySmallFont: action.payload,
        }),
        [SET_FILE_THUMBNAIL_VIEW]: (state, action) => ({
            ...state,
            shouldDisplayThumbnailView: action.payload,
        }),
        [SET_FILE_GRID_COLUMN_COUNT]: (state, action) => ({
            ...state,
            fileGridColumnCount: action.payload,
        }),
        [SET_FILE_FILTERS]: (state, action) => {
            const recentAnnotations = Array.from(
                new Set([
                    // get annotaionName from each filter and add to recents
                    ...castArray(action.payload.map((filter: any) => filter.annotationName)),
                    ...state.recentAnnotations,
                ])
            );
            //let recentAnnotations: string[] = [];

            return {
                ...state,
                filters: action.payload,
                recentAnnotations,
                // Reset file selections when file filters change
                fileSelection: new FileSelection(),
            };
        },
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
        [CHANGE_COLLECTION]: (state, action) => ({
            ...state,
            annotationHierarchy: [],
            collection: action.payload,
            filters: [],
            fileSelection: new FileSelection(),
            openFileFolders: [],
        }),
        [ADD_QUERY]: (state, action) => ({
            ...state,
            queries: [action.payload, ...state.queries],
        }),
        [CHANGE_QUERY]: (state, action: ChangeQuery) => ({
            ...state,
            selectedQuery: action.payload,
        }),
        [SET_QUERIES]: (state, action: SetQueries) => ({
            ...state,
            queries: action.payload,
        }),
        [SET_SORT_COLUMN]: (state, action) => {
            const recentAnnotations = Array.from(
                new Set([...castArray(action.payload.annotationName), ...state.recentAnnotations])
            );
            return {
                ...state,
                recentAnnotations,
                sortColumn: action.payload,
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
        [SET_DISPLAY_ANNOTATIONS]: (state, action) => ({
            ...state,
            displayAnnotations: action.payload,
        }),
        [SET_FILE_SELECTION]: (state, action) => ({
            ...state,
            fileSelection: action.payload,
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => {
            // combine recent hierarchy annotations with payload
            const recentAnnotations = Array.from(
                new Set([...castArray(action.payload), ...state.recentAnnotations])
            );

            return {
                ...state,
                annotationHierarchy: action.payload,
                availableAnnotationsForHierarchyLoading: true,
                recentAnnotations,

                // Reset file selections when annotation hierarchy changes
                fileSelection: new FileSelection(),
            };
        },
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
