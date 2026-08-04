import { makeReducer } from "@aics/redux-utils";
import { castArray, uniq, uniqBy } from "lodash";

import {
    SET_ANNOTATION_HIERARCHY,
    SET_AVAILABLE_ANNOTATIONS,
    SET_FILE_FILTERS,
    SET_FILE_SELECTION,
    SET_OPEN_FILE_FOLDERS,
    SORT_COLUMN,
    SET_SORT_COLUMN,
    CHANGE_DATA_SOURCES,
    SELECT_TUTORIAL,
    RUN_ALL_TUTORIALS,
    ADJUST_GLOBAL_FONT_SIZE,
    Query,
    ADD_QUERY,
    CHANGE_QUERY,
    SET_QUERIES,
    SetQueries,
    ChangeQuery,
    REMOVE_QUERY,
    RemoveQuery,
    RESET_QUERY_FIELDS,
    ChangeDataSourcesAction,
    SetSortColumnAction,
    SetFileFiltersAction,
    CHANGE_SOURCE_METADATA,
    SET_REQUIRES_DATASOURCE_RELOAD,
    SetRequiresDataSourceReload,
    SET_FILE_VIEW,
    SetFileView,
    Column,
    SetColumns,
    SET_COLUMNS,
    COLLAPSE_ALL_FILE_FOLDERS,
    TOGGLE_NULL_VALUE_GROUPS,
    CHANGE_PROVENANCE_SOURCE,
    ChangeProvenanceSource,
    CHANGE_PROVENANCE_ORIGIN_ID,
    ChangeProvenanceOriginId,
    SET_IS_LOADING_DATA_SOURCE,
    SetOpenFileFoldersAction,
    SetFileSelection,
    REORDER_COLUMNS,
    ReorderColumnsAction,
    SetAvailableAnnotationsAction,
} from "./actions";
import interaction from "../interaction";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";
import FileSort, { SortOrder } from "../../entity/FileSort";
import { DEFAULT_COLUMN_WIDTH, FileView, Source } from "../../entity/SearchParams";
import Tutorial from "../../entity/Tutorial";
import Tutorials from "../../hooks/useHelpOptions/Tutorials";

// TODO: Restructure annotationHierarchy, availableAnnotationsForHierarchy, and recentAnnotations
// to store annotation paths (string[][]) instead of concatenated dotted strings.
export interface SelectionStateBranch {
    annotationHierarchy: string[];
    availableAnnotationsForHierarchy: string[] | null;
    availableAnnotationsForHierarchyLoading: boolean;
    columns: Column[];
    dataSources: Source[];
    fileSelection: FileSelection;
    fileView: FileView;
    filters: FileFilter[];
    isLoadingDataSource: boolean;
    lastTouchedFolder?: FileFolder;
    openFileFolders: FileFolder[];
    provenanceOriginId?: string;
    recentAnnotations: string[];
    requiresDataSourceReload?: boolean;
    selectedQuery?: string;
    shouldDisplaySmallFont: boolean;
    shouldShowNullGroups: boolean;
    sortColumn?: FileSort;
    sourceMetadata?: Source;
    sourceProvenance?: Source;
    queries: Query[];
    tutorials?: Tutorial[];
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
    isLoadingDataSource: false,
    openFileFolders: [],
    queries: [],
    recentAnnotations: [],
    requiresDataSourceReload: false,
    shouldDisplaySmallFont: false,
    shouldShowNullGroups: true,
};

export default makeReducer<SelectionStateBranch>(
    {
        [SELECT_TUTORIAL]: (state, action) => ({
            ...state,
            tutorials: [action.payload],
        }),
        [RUN_ALL_TUTORIALS]: (state) => ({
            ...state,
            tutorials: Object.values(Tutorials),
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
        [SET_IS_LOADING_DATA_SOURCE]: (state, action) => ({
            ...state,
            isLoadingDataSource: action.payload,
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
            lastTouchedFolder: undefined,
            openFileFolders: [],
        }),
        [CHANGE_PROVENANCE_ORIGIN_ID]: (state, action: ChangeProvenanceOriginId) => ({
            ...state,
            provenanceOriginId: action.payload,
        }),
        [CHANGE_PROVENANCE_SOURCE]: (state, action: ChangeProvenanceSource) => ({
            ...state,
            sourceProvenance: action.payload,
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
        [RESET_QUERY_FIELDS]: (state) => ({
            ...state,
            annotationHierarchy: initialState.annotationHierarchy,
            columns: initialState.columns,
            filters: initialState.filters,
            fileView: initialState.fileView,
            lastTouchedFolder: undefined,
            openFileFolders: initialState.openFileFolders,
            shouldShowNullGroups: initialState.shouldShowNullGroups,
            sortColumn: undefined,
            dataSources: initialState.dataSources,
            sourceMetadata: undefined,
            sourceProvenance: undefined,
            provenanceOriginId: undefined,

            // If a file is selected, deselect it
            fileForDetailPanel: undefined,
            fileSelection: new FileSelection(),
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
        [SET_COLUMNS]: (state, action: SetColumns) => ({
            ...state,
            columns: action.payload,
        }),
        [SET_FILE_SELECTION]: (state, action: SetFileSelection) => {
            const focusedItem = action.payload.focusedItem;
            const filters = focusedItem?.fileSet.filters ?? [];
            // Build a FileFolder from only the hierarchy-level filters (in hierarchy
            // order) so it matches the openFileFolders shape. Global filters that are
            // not part of the hierarchy must be excluded; otherwise the folder path
            // will be too long and the Ctrl+A select-all shortcut won't match it.
            const hierarchyValues = state.annotationHierarchy
                .map((name) => filters.find((f) => f.name === name))
                .filter((f): f is FileFilter => f !== undefined)
                .map((f) => f.value);
            return {
                ...state,
                fileSelection: action.payload,
                lastTouchedFolder:
                    hierarchyValues.length > 0
                        ? new FileFolder(hierarchyValues)
                        : state.lastTouchedFolder,
            };
        },
        [REORDER_COLUMNS]: (state, action: ReorderColumnsAction) => {
            let columns = [...state.columns];
            for (const reorder of action.payload) {
                const remaining = columns.filter((col) => reorder.name !== col.name);
                let moving = columns.find((col) => reorder.name === col.name);
                if (!moving) {
                    // Check for matching column in special top level annotations like File Name
                    // and if still no match just skip
                    const matchingSpecialAnnotation = TOP_LEVEL_FILE_ANNOTATIONS.find(
                        (a) => reorder.name === a.name || reorder.name === a.displayName
                    );
                    if (!matchingSpecialAnnotation) {
                        continue;
                    }
                    moving = {
                        name: matchingSpecialAnnotation.name,
                        width: DEFAULT_COLUMN_WIDTH,
                    };
                }

                const moveTo = Math.min(reorder.moveTo, remaining.length);
                columns = [
                    ...remaining.slice(0, moveTo),
                    // Optionally update widths of moved columns if provided in the action
                    { ...moving, width: reorder.width ?? moving.width },
                    ...remaining.slice(moveTo),
                ];
            }
            return { ...state, columns };
        },
        [SET_ANNOTATION_HIERARCHY]: (state, action) => ({
            ...state,
            annotationHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: true,
            recentAnnotations: uniq([...action.payload, ...state.recentAnnotations]).slice(0, 5),

            // Reset file selections when annotation hierarchy changes
            fileSelection: new FileSelection(),
        }),
        [SET_AVAILABLE_ANNOTATIONS]: (state, action: SetAvailableAnnotationsAction) => ({
            ...state,
            availableAnnotationsForHierarchy: action.payload,
            availableAnnotationsForHierarchyLoading: false,
        }),
        [COLLAPSE_ALL_FILE_FOLDERS]: (state) => ({
            ...state,
            lastTouchedFolder: undefined,
            openFileFolders: [],
        }),
        [SET_OPEN_FILE_FOLDERS]: (state, action: SetOpenFileFoldersAction) => {
            const openFileFolders = action.payload;
            // If folders are being opened (as opposed to closed), update the open folders and last touched folder accordingly
            if (openFileFolders.length > state.openFileFolders.length) {
                return {
                    ...state,
                    openFileFolders,
                };
            }
            // If the last-touched folder is still open, keep it as the last-touched folder
            // otherwise it will become undefined which will cause the directory tree to
            // lose track of which folder the user is in and reset
            const lastTouchedFolder = openFileFolders.find((f) =>
                f.equals(state.lastTouchedFolder)
            );
            return {
                ...state,
                lastTouchedFolder: lastTouchedFolder,
                openFileFolders,
            };
        },
        [TOGGLE_NULL_VALUE_GROUPS]: (state, action) => ({
            ...state,
            shouldShowNullGroups:
                action.payload !== undefined ? action.payload : !state.shouldShowNullGroups,
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
