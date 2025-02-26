import { makeReducer } from "@aics/redux-utils";
import { castArray, uniq, uniqBy } from "lodash";

import {
    SET_ANNOTATION_HIERARCHY,
    SET_AVAILABLE_ANNOTATIONS,
    SET_FILE_FILTERS,
    SET_FILE_SELECTION,
    SET_OPEN_FILE_FOLDERS,
    RESIZE_COLUMN,
    SORT_COLUMN,
    SET_SORT_COLUMN,
    CHANGE_DATA_SOURCES,
    SELECT_TUTORIAL,
    ADJUST_GLOBAL_FONT_SIZE,
    Query,
    ADD_QUERY,
    CHANGE_QUERY,
    SET_QUERIES,
    SetQueries,
    ChangeQuery,
    REMOVE_QUERY,
    RemoveQuery,
    ChangeDataSourcesAction,
    SetSortColumnAction,
    SetFileFiltersAction,
    CHANGE_SOURCE_METADATA,
    SET_REQUIRES_DATASOURCE_RELOAD,
    SetRequiresDataSourceReload,
    SET_FILE_VIEW,
    SetFileView,
    ResizeColumnAction,
    Column,
    SetColumns,
    SET_COLUMNS,
    COLLAPSE_ALL_FILE_FOLDERS,
} from "./actions";
import interaction from "../interaction";
import { FileView, Source } from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";
import FileSort, { SortOrder } from "../../entity/FileSort";
import Tutorial from "../../entity/Tutorial";

export interface SelectionStateBranch {
    annotationHierarchy: string[];
    availableAnnotationsForHierarchy: string[];
    availableAnnotationsForHierarchyLoading: boolean;
    columns: Column[];
    dataSources: Source[];
    fileSelection: FileSelection;
    fileView: FileView;
    filters: FileFilter[];
    openFileFolders: FileFolder[];
    recentAnnotations: string[];
    requiresDataSourceReload?: boolean;
    selectedQuery?: string;
    shouldDisplaySmallFont: boolean;
    sortColumn?: FileSort;
    sourceMetadata?: Source;
    queries: Query[];
    tutorial?: Tutorial;
}

export const initialState = {
    annotationHierarchy: [],
    availableAnnotationsForHierarchy: [],
    availableAnnotationsForHierarchyLoading: true,
    columns: [],
    dataSources: [],
    fileSelection: new FileSelection(),
    fileView: FileView.LIST,
    filters: [],
    openFileFolders: [],
    queries: [],
    recentAnnotations: [],
    requiresDataSourceReload: false,
    shouldDisplaySmallFont: false,
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
        [SET_FILE_FILTERS]: (state, action: SetFileFiltersAction) => ({
            ...state,
            filters: action.payload,
            recentAnnotations: uniq([
                ...action.payload.map((filter) => filter.name),
                ...state.recentAnnotations,
            ]).slice(0, 5),

            // Reset file selections when file filters change
            fileSelection: new FileSelection(),
        }),
        [SET_FILE_VIEW]: (state, action: SetFileView) => ({
            ...state,
            fileView: action.payload,
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
        [CHANGE_DATA_SOURCES]: (state, action: ChangeDataSourcesAction) => ({
            ...state,
            dataSources: uniqBy(action.payload, "name"),
            fileSelection: new FileSelection(),
            openFileFolders: [],
        }),
        [CHANGE_SOURCE_METADATA]: (state, action) => ({
            ...state,
            sourceMetadata: action.payload,
        }),
        [ADD_QUERY]: (state, action) => ({
            ...state,
            queries: [action.payload, ...state.queries],
        }),
        [CHANGE_QUERY]: (state, action: ChangeQuery) => ({
            ...state,
            selectedQuery: action.payload?.name,
        }),
        [REMOVE_QUERY]: (state, action: RemoveQuery) => ({
            ...state,
            queries: state.queries.filter((query) => query.name !== action.payload),
        }),
        [SET_QUERIES]: (state, action: SetQueries) => ({
            ...state,
            queries: action.payload,
        }),
        [SET_SORT_COLUMN]: (state, action: SetSortColumnAction) => ({
            ...state,
            recentAnnotations: uniq([
                ...castArray(action.payload?.annotationName ?? []),
                ...state.recentAnnotations,
            ]).slice(0, 5),
            sortColumn: action.payload,
        }),
        [interaction.actions.REFRESH]: (state) => ({
            ...state,
            availableAnnotationsForHierarchyLoading: true,
            fileSelection: new FileSelection(),
        }),
        [RESIZE_COLUMN]: (state, action: ResizeColumnAction) => ({
            ...state,
            columns: state.columns.map((column) =>
                column.name !== action.payload.name ? column : action.payload
            ),
        }),
        [SET_COLUMNS]: (state, action: SetColumns) => ({
            ...state,
            columns: action.payload,
        }),
        [SET_FILE_SELECTION]: (state, action) => ({
            ...state,
            fileSelection: action.payload,
        }),
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: true,
            recentAnnotations: uniq([...action.payload, ...state.recentAnnotations]).slice(0, 5),

            // Reset file selections when annotation hierarchy changes
            fileSelection: new FileSelection(),
        }),
        [SET_AVAILABLE_ANNOTATIONS]: (state, action) => ({
            ...state,
            availableAnnotationsForHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: false,
        }),
        [COLLAPSE_ALL_FILE_FOLDERS]: (state) => ({
            ...state,
            openFileFolders: [],
        }),
        [SET_OPEN_FILE_FOLDERS]: (state, action) => ({
            ...state,
            openFileFolders: action.payload,
        }),
        [interaction.actions.INITIALIZE_APP]: (state) => ({
            ...state,

            // Reset file selections when pointed at a new backend
            fileSelection: new FileSelection(),
        }),
        [SET_REQUIRES_DATASOURCE_RELOAD]: (state, action: SetRequiresDataSourceReload) => ({
            ...state,
            requiresDataSourceReload: action.payload,
        }),
    },
    initialState
);
