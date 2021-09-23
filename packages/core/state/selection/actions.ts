import { makeConstant } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import FileSort from "../../entity/FileSort";
import NumericRange from "../../entity/NumericRange";

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
 * SELECT_DISPLAY_ANNOTATION
 *
 * Intention to select one or many annotations for a file to display in the file list (i.e., as a column).
 *
 * For example, by default, we may only see "File name | File size | Date created" as the columns in the file list. This
 * is the mechanism for a user to then add a column to view. If `replace` is `true`, the intention of the action
 * should be interpreted as a setter instead of a updated.
 */
export const SELECT_DISPLAY_ANNOTATION = makeConstant(
    STATE_BRANCH_NAME,
    "select-display-annotation"
);

export interface SelectDisplayAnnotationAction {
    payload: {
        annotation: Annotation | Annotation[];
        replace: boolean;
    };
    type: string;
}

export function selectDisplayAnnotation(
    annotation: Annotation | Annotation[],
    replace = false
): SelectDisplayAnnotationAction {
    return {
        payload: {
            annotation,
            replace,
        },
        type: SELECT_DISPLAY_ANNOTATION,
    };
}

/**
 * DESELECT_DISPLAY_ANNOTATION
 *
 * Intention to deselect one or many annotations from the columns of the file list. See comment for
 * SELECT_DISPLAY_ANNOTATION for further explanation.
 */

export const DESELECT_DISPLAY_ANNOTATION = makeConstant(
    STATE_BRANCH_NAME,
    "deselect-display-annotation"
);

export interface DeselectDisplayAnnotationAction {
    payload: Annotation | Annotation[];
    type: string;
}

export function deselectDisplayAnnotation(
    annotation: Annotation | Annotation[]
): DeselectDisplayAnnotationAction {
    return {
        payload: annotation,
        type: DESELECT_DISPLAY_ANNOTATION,
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
    payload: Annotation[];
    type: string;
}

export function setAnnotationHierarchy(annotations: Annotation[]): SetAnnotationHierarchyAction {
    return {
        payload: annotations,
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
 * SET_FILE_SET_SOURCE
 *
 * Intention to update the file set source queries are made against
 */
export const SET_FILE_SET_SOURCE = makeConstant(STATE_BRANCH_NAME, "set-file-set-source");

export interface SetFileSetSourceAction {
    payload?: string;
    type: string;
}

export function setFileSetSource(datasetId?: string): SetFileSetSourceAction {
    return {
        payload: datasetId,
        type: SET_FILE_SET_SOURCE,
    };
}

/**
 * CHANGE_VIEW
 * 
 * TODO
 */
export const CHANGE_VIEW = makeConstant(STATE_BRANCH_NAME, "change-view");

export interface ChangeViewAction {
    payload: string;
    type: string;
}

export function changeView(viewId: string): ChangeViewAction {
    return {
        payload: viewId,
        type: CHANGE_VIEW,
    }
}
