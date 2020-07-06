import { makeConstant } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";

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
 * SELECT_DISPLAY_ANNOTATION
 *
 * Intention to select one or many annotations for a file to display in the file list (i.e., as a column).
 *
 * For example, by default, we may only see "File name | File size | Date created" as the columns in the file list. This
 * is the mechanism for a user to then add or remove a column to view.
 */
export const SELECT_DISPLAY_ANNOTATION = makeConstant(
    STATE_BRANCH_NAME,
    "select-display-annotation"
);

export interface SelectDisplayAnnotationAction {
    payload: Annotation | Annotation[];
    type: string;
}

export function selectDisplayAnnotation(
    annotation: Annotation | Annotation[]
): SelectDisplayAnnotationAction {
    return {
        payload: annotation,
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
 * SELECT_FILE
 *
 * Intention to mark one or many files as "selected." If `payload.updateExistingSelection`, add `payload.file` to
 * existing selection, else, replace existing selection. The first selected file will be displayed by default in the
 * details pane. Other uses for file selection are file download, dataset creation, and opening files with another tool.
 */
export const SELECT_FILE = makeConstant(STATE_BRANCH_NAME, "select-file");

export interface SelectFileAction {
    payload: {
        correspondingFileSet: string; // FileSet::hash
        fileIndex: number | number[];
        updateExistingSelection: boolean;
    };
    type: string;
}

export function selectFile(
    correspondingFileSet: string, // FileSet::hash
    fileIndex: number | number[],
    updateExistingSelection = false
): SelectFileAction {
    return {
        payload: {
            correspondingFileSet,
            fileIndex,
            updateExistingSelection,
        },
        type: SELECT_FILE,
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
 * SET_COMBINABLE_ANNOTATIONS
 * Intention to set annotations available for addition to the current hierarchy
 */
export const SET_COMBINABLE_ANNOTATIONS = makeConstant(
    STATE_BRANCH_NAME,
    "set-combinable-annotations"
);

export interface setCombinableAnnotationsAction {
    payload: string[];
    type: string;
}

export function setCombinableAnnotations(
    annotationNames: string[]
): setCombinableAnnotationsAction {
    return {
        payload: annotationNames,
        type: SET_COMBINABLE_ANNOTATIONS,
    };
}
