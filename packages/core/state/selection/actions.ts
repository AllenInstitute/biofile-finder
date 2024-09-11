import { makeConstant } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import FileSort from "../../entity/FileSort";
import NumericRange from "../../entity/NumericRange";
import ExcludeFilter from "../../entity/SimpleFilter/ExcludeFilter";
import FuzzyFilter from "../../entity/SimpleFilter/FuzzyFilter";
import IncludeFilter from "../../entity/SimpleFilter/IncludeFilter";
import Tutorial from "../../entity/Tutorial";
import {
    EMPTY_QUERY_COMPONENTS,
    FileExplorerURLComponents,
    Source,
} from "../../entity/FileExplorerURL";

const STATE_BRANCH_NAME = "selection";

/**
 * SET_FILE_FILTERS
 *
 * Intention to set, wholesale, a list of FileFilters into application state. This should not be dispatched
 * by UI components; dispatch either an ADD_FILE_FILTER or REMOVE_FILE_FILTER action. Those actions will
 * trigger the `modifyFileFilters` logic, which will then dispatch this action.
 */
export const SET_FILE_FILTERS = makeConstant(STATE_BRANCH_NAME, "set-file-filters");

export interface SetFileFiltersAction {
    payload: FileFilter[];
    type: string;
}

export function setFileFilters(filters: FileFilter[]): SetFileFiltersAction {
    return {
        payload: filters,
        type: SET_FILE_FILTERS,
    };
}

/**
 * ADD_FILE_FILTER
 *
 * Intention to apply a FileFilter.
 */
export const ADD_FILE_FILTER = makeConstant(STATE_BRANCH_NAME, "add-file-filter");

export interface AddFileFilterAction {
    payload: FileFilter | FileFilter[];
    type: string;
}

export function addFileFilter(filter: FileFilter | FileFilter[]): AddFileFilterAction {
    return {
        payload: filter,
        type: ADD_FILE_FILTER,
    };
}

/**
 * REMOVE_FILE_FILTER
 *
 * Intention to remove a currently applied FileFilter.
 */
export const REMOVE_FILE_FILTER = makeConstant(STATE_BRANCH_NAME, "remove-file-filter");

export interface RemoveFileFilterAction {
    payload: FileFilter | FileFilter[];
    type: string;
}

export function removeFileFilter(filter: FileFilter | FileFilter[]): RemoveFileFilterAction {
    return {
        payload: filter,
        type: REMOVE_FILE_FILTER,
    };
}

/**
 * SET_FUZZY_FILTERS
 *
 * Intention to set, wholesale, a list of FuzzyFilters into application state. This should not be dispatched
 * by UI components; dispatch either an ADD_FUZZY_FILTER or REMOVE_FUZZY_FILTER action. Those actions will
 * trigger the `modifyFuzzyFilters` logic, which will then dispatch this action.
 */
export const SET_FUZZY_FILTERS = makeConstant(STATE_BRANCH_NAME, "set-fuzzy-filters");

export interface SetFuzzyFiltersAction {
    payload?: FuzzyFilter[];
    type: string;
}

export function setFuzzyFilters(fuzzyFilters?: FuzzyFilter[]): SetFuzzyFiltersAction {
    return {
        payload: fuzzyFilters,
        type: SET_FUZZY_FILTERS,
    };
}

/**
 * ADD_FUZZY_FILTER
 *
 * Intention to apply a FuzzyFilter.
 */
export const ADD_FUZZY_FILTER = makeConstant(STATE_BRANCH_NAME, "add-fuzzy-filter");

export interface AddFuzzyFilterAction {
    payload: FuzzyFilter | FuzzyFilter[];
    type: string;
}

export function addFuzzyFilter(filter: FuzzyFilter | FuzzyFilter[]): AddFuzzyFilterAction {
    return {
        payload: filter,
        type: ADD_FUZZY_FILTER,
    };
}

/**
 * REMOVE_FUZZY_FILTER
 *
 * Intention to remove a currently applied FuzzyFilter.
 */
export const REMOVE_FUZZY_FILTER = makeConstant(STATE_BRANCH_NAME, "remove-fuzzy-filter");

export interface RemoveFuzzyFilterAction {
    payload: FuzzyFilter | FuzzyFilter[];
    type: string;
}

export function removeFuzzyFilter(filter: FuzzyFilter | FuzzyFilter[]): RemoveFuzzyFilterAction {
    return {
        payload: filter,
        type: REMOVE_FUZZY_FILTER,
    };
}

/**
 * SET_INCLUDE_FILTERS
 *
 * Intention to set, wholesale, a list of IncludeFilters into application state. This should not be dispatched
 * by UI components; dispatch either an ADD_INCLUDE_FILTER or REMOVE_INCLUDE_FILTER action. Those actions will
 * trigger the `modifyIncludeFilters` logic, which will then dispatch this action.
 */
export const SET_INCLUDE_FILTERS = makeConstant(STATE_BRANCH_NAME, "set-include-filters");

export interface SetIncludeFiltersAction {
    payload?: IncludeFilter[];
    type: string;
}

export function setIncludeFilters(includeFilters?: IncludeFilter[]): SetIncludeFiltersAction {
    return {
        payload: includeFilters,
        type: SET_INCLUDE_FILTERS,
    };
}

/**
 * ADD_INCLUDE_FILTER
 *
 * Intention to apply a IncludeFilter (aka, any value filter).
 */
export const ADD_INCLUDE_FILTER = makeConstant(STATE_BRANCH_NAME, "add-include-filter");

export interface AddIncludeFilterAction {
    payload: IncludeFilter | IncludeFilter[];
    type: string;
}

export function addIncludeFilter(filter: IncludeFilter | IncludeFilter[]): AddIncludeFilterAction {
    return {
        payload: filter,
        type: ADD_INCLUDE_FILTER,
    };
}

/**
 * REMOVE_INCLUDE_FILTER
 *
 * Intention to remove a currently applied IncludeFilter.
 */
export const REMOVE_INCLUDE_FILTER = makeConstant(STATE_BRANCH_NAME, "remove-include-filter");

export interface RemoveIncludeFilterAction {
    payload: IncludeFilter | IncludeFilter[];
    type: string;
}

export function removeIncludeFilter(
    filter: IncludeFilter | IncludeFilter[]
): RemoveIncludeFilterAction {
    return {
        payload: filter,
        type: REMOVE_INCLUDE_FILTER,
    };
}

/**
 * SET_EXCLUDE_FILTERS
 *
 * Intention to set, wholesale, a list of ExcludeFilters into application state. This should not be dispatched
 * by UI components; dispatch either an ADD_ExCLUDE_FILTER or REMOVE_EXCLUDE_FILTER action. Those actions will
 * trigger the `modifyExcludeFilters` logic, which will then dispatch this action.
 */
export const SET_EXCLUDE_FILTERS = makeConstant(STATE_BRANCH_NAME, "set-exclude-filters");

export interface SetExcludeFiltersAction {
    payload?: ExcludeFilter[];
    type: string;
}

export function setExcludeFilters(excludeFilters?: ExcludeFilter[]): SetExcludeFiltersAction {
    return {
        payload: excludeFilters,
        type: SET_EXCLUDE_FILTERS,
    };
}

/**
 * ADD_EXCLUDE_FILTER
 *
 * Intention to apply a ExcludeFilter (aka, any value filter).
 */
export const ADD_EXCLUDE_FILTER = makeConstant(STATE_BRANCH_NAME, "add-exclude-filter");

export interface AddExcludeFilterAction {
    payload: ExcludeFilter | ExcludeFilter[];
    type: string;
}

export function addExcludeFilter(filter: ExcludeFilter | ExcludeFilter[]): AddExcludeFilterAction {
    return {
        payload: filter,
        type: ADD_EXCLUDE_FILTER,
    };
}

/**
 * REMOVE_EXCLUDE_FILTER
 *
 * Intention to remove a currently applied ExcludeFilter.
 */
export const REMOVE_EXCLUDE_FILTER = makeConstant(STATE_BRANCH_NAME, "remove-exclude-filter");

export interface RemoveExcludeFilterAction {
    payload: ExcludeFilter | ExcludeFilter[];
    type: string;
}

export function removeExcludeFilter(
    filter: ExcludeFilter | ExcludeFilter[]
): RemoveExcludeFilterAction {
    return {
        payload: filter,
        type: REMOVE_EXCLUDE_FILTER,
    };
}

/**
 * SORT_COLUMN
 *
 * Intention to sort files by a specific column
 */
export const SORT_COLUMN = makeConstant(STATE_BRANCH_NAME, "sort-column");

export interface SortColumnAction {
    payload: string;
    type: string;
}

export function sortColumn(annotation: string): SortColumnAction {
    return {
        payload: annotation,
        type: SORT_COLUMN,
    };
}

/**
 * SET_SORT_COLUMN
 *
 * Intention to set the column to sort on
 */
export const SET_SORT_COLUMN = makeConstant(STATE_BRANCH_NAME, "set-sort-column");

export interface SetSortColumnAction {
    payload?: FileSort;
    type: string;
}

export function setSortColumn(fileSort?: FileSort): SetSortColumnAction {
    return {
        payload: fileSort,
        type: SET_SORT_COLUMN,
    };
}

/**
 * SET_DISPLAY_ANNOTATIONS
 *
 * Intention to select annotations for a file to display in the file list (i.e., as a column).
 *
 * For example, by default, we may only see "File name | File size | Date created" as the columns in the file list. This
 * is the mechanism for a user to then add/remove a column to view.
 */
export const SET_DISPLAY_ANNOTATIONS = makeConstant(STATE_BRANCH_NAME, "set-display-annotations");

export interface SetDisplayAnnotationsAction {
    payload: Annotation[];
    type: string;
}

export function setDisplayAnnotations(annotations: Annotation[]): SetDisplayAnnotationsAction {
    return {
        payload: annotations,
        type: SET_DISPLAY_ANNOTATIONS,
    };
}

/**
 * RESIZE_COLUMN
 *
 * Intention to specify a particular amount of horizontal space a column within a file list should take up.
 */
export const RESIZE_COLUMN = makeConstant(STATE_BRANCH_NAME, "resize-column");

export interface ResizeColumnAction {
    payload: {
        columnHeader: string;
        widthPercent: number; // between 0 and 1
    };
    type: string;
}

export function resizeColumn(columnHeader: string, widthPercent: number) {
    return {
        payload: {
            columnHeader,
            widthPercent,
        },
        type: RESIZE_COLUMN,
    };
}

/**
 * RESET_COLUMN_WIDTH
 *
 * Intention to remove a previous manual resizing of a column using the ResizeColumnAction. The expectation
 * is that if no specific mapping between a column and a width exists in state, a default will apply.
 */
export const RESET_COLUMN_WIDTH = makeConstant(STATE_BRANCH_NAME, "reset-column-width");

export interface ResetColumnWidthAction {
    payload: string; // columnHeader
    type: string;
}

export function resetColumnWidth(columnHeader: string) {
    return {
        payload: columnHeader,
        type: RESET_COLUMN_WIDTH,
    };
}

/**
 * SELECT_FILE
 *
 * Intention to mark one or many files as "selected." If `payload.updateExistingSelection`, add `payload.file` to
 * existing selection, else, replace existing selection. The last selected file will be displayed by default in the
 * details pane. Other uses for file selection are file download, dataset creation, and opening files with another tool.
 */
export const SELECT_FILE = makeConstant(STATE_BRANCH_NAME, "select-file");

interface SelectFileActionPayload {
    fileSet: FileSet;
    lastTouched?: number | undefined; // last index selected
    selection: number | NumericRange;
    sortOrder: number;
    updateExistingSelection?: boolean;
}

export interface SelectFileAction {
    payload: SelectFileActionPayload;
    type: string;
}

export function selectFile(payload: SelectFileActionPayload): SelectFileAction {
    const {
        fileSet,
        lastTouched = undefined,
        selection,
        sortOrder,
        updateExistingSelection = false,
    } = payload;

    return {
        payload: {
            fileSet,
            selection,
            sortOrder,
            updateExistingSelection,
            lastTouched,
        },
        type: SELECT_FILE,
    };
}

/**
 * SELECT_NEARBY_FILE
 *
 * Intention to mark the file directly above or below as "selected." If `payload.updateExistingSelection`, add the
 * corresponding file to the existing selection, else, replace existing selection. The newly selected file will be displayed
 * within the file details pane.
 */
export const SELECT_NEARBY_FILE = makeConstant(STATE_BRANCH_NAME, "select-nearby-file");

export interface SelectNearbyFileAction {
    payload: {
        direction: "up" | "down";
        updateExistingSelection: boolean;
    };
    type: string;
}

export function selectNearbyFile(
    direction: "up" | "down",
    updateExistingSelection: boolean
): SelectNearbyFileAction {
    return {
        payload: {
            direction,
            updateExistingSelection,
        },
        type: SELECT_NEARBY_FILE,
    };
}

/**
 * SET_QUERIES
 *
 * Intention is to set the queries available to switch to in the file explorer.
 */
export const SET_QUERIES = makeConstant(STATE_BRANCH_NAME, "set-queries");

export interface SetQueries {
    payload: Query[];
    type: string;
}

export function setQueries(queries: Query[]): SetQueries {
    return {
        payload: queries,
        type: SET_QUERIES,
    };
}

/**
 * ADD_QUERY
 *
 * Intention is to add a new query to the list of queries available to switch to in the file explorer.
 */
export const ADD_QUERY = makeConstant(STATE_BRANCH_NAME, "add-query");

export interface Query {
    name: string;
    parts: FileExplorerURLComponents;
}

interface PartialQuery {
    name: string;
    parts: Partial<FileExplorerURLComponents>;
}

export interface AddQuery {
    payload: Query;
    type: string;
}

export function addQuery(query: PartialQuery): AddQuery {
    return {
        payload: {
            ...query,
            parts: {
                ...EMPTY_QUERY_COMPONENTS,
                ...query.parts,
            },
        },
        type: ADD_QUERY,
    };
}

/**
 * CHANGE_QUERY
 *
 * Intention is to select a pre-saved view to switch to (a view includes things like filters and sorts).
 */
export const CHANGE_QUERY = makeConstant(STATE_BRANCH_NAME, "change-query");

export interface ChangeQuery {
    payload?: Query;
    type: string;
}

export function changeQuery(query?: PartialQuery): ChangeQuery {
    return {
        payload: query
            ? {
                  ...query,
                  parts: {
                      ...EMPTY_QUERY_COMPONENTS,
                      ...query.parts,
                  },
              }
            : undefined,
        type: CHANGE_QUERY,
    };
}

/**
 * REMOVE_QUERY
 *
 * Intention is to remove a query from the list of queries available to switch to in the file explorer.
 */
export const REMOVE_QUERY = makeConstant(STATE_BRANCH_NAME, "remove-query");

export interface RemoveQuery {
    payload: string;
    type: string;
}

export function removeQuery(queryName: string): RemoveQuery {
    return {
        payload: queryName,
        type: REMOVE_QUERY,
    };
}

/**
 * REPLACE_DATA_SOURCE
 *
 * Intention to replace the current data source with a new one.
 */
export const REPLACE_DATA_SOURCE = makeConstant(STATE_BRANCH_NAME, "replace-data-source");

export interface ReplaceDataSource {
    payload: Source;
    type: string;
}

export function replaceDataSource(dataSource: Source): ReplaceDataSource {
    return {
        payload: dataSource,
        type: REPLACE_DATA_SOURCE,
    };
}

/**
 * SET_FILE_SELECTION
 *
 * This is not to be fired by UI; use the SELECT_FILE action instead.
 *
 * Setter-type action fired by selection/logics:selectFile, which intercepts SELECT_FILE actions,
 * processes them along with existing selection state to create exact selection payloads that can
 * be set directly into state. The seperation is to allow keeping a large amount of business logic
 * out of the reducer.
 */
export const SET_FILE_SELECTION = makeConstant(STATE_BRANCH_NAME, "set-file-selection");

export interface SetFileSelection {
    payload: FileSelection;
    type: string;
}

export function setFileSelection(selection: FileSelection): SetFileSelection {
    return {
        payload: selection,
        type: SET_FILE_SELECTION,
    };
}

/**
 * REORDER_ANNOTATION_HIERARCHY
 * Intention to reorder an annotation within the hierachy of annotations by which to group files.
 * By specifying an annotation not previously in the hierachy and any index within the hierachy (or N + 1, in the case of adding to end of hierarchy), this action also handles adding new annotations to the hierarchy.
 */
export const REORDER_ANNOTATION_HIERARCHY = makeConstant(
    STATE_BRANCH_NAME,
    "reorder-annotation-hierarchy"
);

export interface ReorderAnnotationHierarchyAction {
    payload: {
        id: string; // annotation_name
        moveTo: number; // new index
    };
    type: string;
}

export function reorderAnnotationHierarchy(
    annotationName: string,
    moveTo: number
): ReorderAnnotationHierarchyAction {
    return {
        payload: {
            id: annotationName,
            moveTo,
        },
        type: REORDER_ANNOTATION_HIERARCHY,
    };
}

/**
 * REMOVE_FROM_ANNOTATION_HIERARCHY
 * Intention to remove an annotation from the hierarchy of annotations by which to group files.
 */
export const REMOVE_FROM_ANNOTATION_HIERARCHY = makeConstant(
    STATE_BRANCH_NAME,
    "remove-from-annotation-hierarchy"
);

export interface RemoveFromAnnotationHierarchyAction {
    payload: {
        id: string; // annotation_name
    };
    type: string;
}

export function removeFromAnnotationHierarchy(
    annotationName: string
): RemoveFromAnnotationHierarchyAction {
    return {
        payload: {
            id: annotationName,
        },
        type: REMOVE_FROM_ANNOTATION_HIERARCHY,
    };
}

/**
 * SET_ANNOTATION_HIERARCHY
 * Intention to set hierarchy of annotations by which to group files.
 */
export const SET_ANNOTATION_HIERARCHY = makeConstant(STATE_BRANCH_NAME, "set-annotation-hierarchy");

export interface SetAnnotationHierarchyAction {
    payload: string[];
    type: string;
}

export function setAnnotationHierarchy(annotationNames: string[]): SetAnnotationHierarchyAction {
    return {
        payload: annotationNames,
        type: SET_ANNOTATION_HIERARCHY,
    };
}

/**
 * SET_AVAILABLE_ANNOTATIONS
 * Intention to set annotations available for addition to the current hierarchy
 */
export const SET_AVAILABLE_ANNOTATIONS = makeConstant(
    STATE_BRANCH_NAME,
    "set-available-annotations"
);

export interface SetAvailableAnnotationsAction {
    payload: string[];
    type: string;
}

export function setAvailableAnnotations(annotationNames: string[]): SetAvailableAnnotationsAction {
    return {
        payload: annotationNames,
        type: SET_AVAILABLE_ANNOTATIONS,
    };
}

/**
 * TOGGLE_FILE_FOLDER_COLLAPSE
 * Intention to toggle the given file folder's collapsed state
 */
export const TOGGLE_FILE_FOLDER_COLLAPSE = makeConstant(
    STATE_BRANCH_NAME,
    "toggle-file-folder-collapse"
);

export interface ToggleFileFolderCollapseAction {
    payload: FileFolder;
    type: string;
}

export function toggleFileFolderCollapse(fileFolder: FileFolder): ToggleFileFolderCollapseAction {
    return {
        payload: fileFolder,
        type: TOGGLE_FILE_FOLDER_COLLAPSE,
    };
}

/**
 * SET_OPEN_FILE_FOLDERS
 * Intention to set which file folders are open as opposed to collapsed
 */
export const SET_OPEN_FILE_FOLDERS = makeConstant(STATE_BRANCH_NAME, "set-open-file-folders");

export interface SetOpenFileFoldersAction {
    payload: FileFolder[];
    type: string;
}

export function setOpenFileFolders(openFileFolders: FileFolder[]): SetOpenFileFoldersAction {
    return {
        payload: openFileFolders,
        type: SET_OPEN_FILE_FOLDERS,
    };
}

/**
 * DECODE_FILE_EXPLORER_URL
 *
 * Intention to decode an incoming file explorer URL into application state
 */
export const DECODE_FILE_EXPLORER_URL = makeConstant(STATE_BRANCH_NAME, "decode-file-explorer-url");

export interface DecodeFileExplorerURLAction {
    payload: string;
    type: string;
}

export function decodeFileExplorerURL(decodedFileExplorerURL: string): DecodeFileExplorerURLAction {
    return {
        payload: decodedFileExplorerURL,
        type: DECODE_FILE_EXPLORER_URL,
    };
}

/**
 * CHANGE_DATA_SOURCES
 *
 * Intention to update the data sources queries are run against.
 */
export const CHANGE_DATA_SOURCES = makeConstant(STATE_BRANCH_NAME, "change-data-sources");

export interface ChangeDataSourcesAction {
    payload: Source[];
    type: string;
}

export function changeDataSources(dataSources: Source[]): ChangeDataSourcesAction {
    return {
        payload: dataSources,
        type: CHANGE_DATA_SOURCES,
    };
}

/**
 * CHANGE_SOURCE_METADATA
 *
 * Intention to update the source file supplying metadata about the selected data sources
 */
export const CHANGE_SOURCE_METADATA = makeConstant(STATE_BRANCH_NAME, "change-source-metadata");

export interface ChangeSourceMetadataAction {
    payload?: Source;
    type: string;
}

export function changeSourceMetadata(source?: Source): ChangeSourceMetadataAction {
    return {
        payload: source,
        type: CHANGE_SOURCE_METADATA,
    };
}

/**
 * SELECT_TUTORIAL
 *
 * Intention to update the current tutorial step displayed to users
 */
export const SELECT_TUTORIAL = makeConstant(STATE_BRANCH_NAME, "select-tutorial");

export interface SelectTutorial {
    payload?: Tutorial;
    type: string;
}

export function selectTutorial(tutorial?: Tutorial): SelectTutorial {
    return {
        payload: tutorial,
        type: SELECT_TUTORIAL,
    };
}

/**
 * ADJUST_GLOBAL_FONT_SIZE
 *
 * Intention to set whether the current font size should be small or the default
 */
export const ADJUST_GLOBAL_FONT_SIZE = makeConstant(STATE_BRANCH_NAME, "adjust-global-font-size");

export interface AdjustGlobalFontSize {
    payload: boolean;
    type: string;
}

export function adjustGlobalFontSize(shouldDisplaySmallFont: boolean): AdjustGlobalFontSize {
    return {
        payload: shouldDisplaySmallFont,
        type: ADJUST_GLOBAL_FONT_SIZE,
    };
}

/**
 * SET_FILE_VIEW_TYPE
 *
 * Intention to set the file view type to thumbnail or list
 */
export const SET_FILE_THUMBNAIL_VIEW = makeConstant(STATE_BRANCH_NAME, "set-file-thumbnail-view");

export interface SetFileThumbnailView {
    payload: boolean;
    type: string;
}

export function setFileThumbnailView(shouldDisplayThumbnailView: boolean): SetFileThumbnailView {
    return {
        payload: shouldDisplayThumbnailView,
        type: SET_FILE_THUMBNAIL_VIEW,
    };
}

/**
 * SET_FILE_GRID_COLUMN_COUNT
 */
export const SET_FILE_GRID_COLUMN_COUNT = makeConstant(
    STATE_BRANCH_NAME,
    "set-file-grid-column-count"
);

export interface SetFileGridColumnCount {
    payload: number;
    type: string;
}

export function setFileGridColumnCount(fileGridColumnCount: number): SetFileGridColumnCount {
    return {
        payload: fileGridColumnCount,
        type: SET_FILE_GRID_COLUMN_COUNT,
    };
}
