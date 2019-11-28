import Annotation from "../../entity/Annotation";

import { makeConstant } from "../util";

const STATE_BRANCH_NAME = "selection";

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
        updateExistingSelection: boolean;
        file: string | string[];
    };
    type: string;
}

export function selectFile(
    file: string | string[],
    updateExistingSelection = false
): SelectFileAction {
    return {
        payload: {
            updateExistingSelection,
            file,
        },
        type: SELECT_FILE,
    };
}

/**
 * DESELECT_FILE
 *
 * Intention to remove a file from list of selected files.
 */
export const DESELECT_FILE = makeConstant(STATE_BRANCH_NAME, "deselect-file");

export interface DeselectFileAction {
    payload: string | string[];
    type: string;
}

export function deselectFile(file: string | string[]): DeselectFileAction {
    return {
        payload: file,
        type: DESELECT_FILE,
    };
}

/**
 * MODIFY_ANNOTATION_HIERARCHY
 *
 */
export const MODIFY_ANNOTATION_HIERARCHY = makeConstant(
    STATE_BRANCH_NAME,
    "modify-annotation-hierarchy"
);

export interface ModifyAnnotationHierarchyAction {
    payload: string; // annotation_name
    type: string;
}

export function modifyAnnotationHierarchy(annotationName: string): ModifyAnnotationHierarchyAction {
    return {
        payload: annotationName,
        type: MODIFY_ANNOTATION_HIERARCHY,
    };
}

/**
 * SET_ANNOTATION_HIERARCHY
 *
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
