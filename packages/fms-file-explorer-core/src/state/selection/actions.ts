import { makeConstant } from "../util";

const STATE_BRANCH_NAME = "selection";

/**
 * Intention to set a file as selected.
 */
export const SELECT_FILE = makeConstant(STATE_BRANCH_NAME, "select-file");

export interface SelectFileAction {
    payload: string | string[];
    type: string;
}

export function selectFile(fileId: string | string[]): SelectFileAction {
    return {
        payload: fileId,
        type: SELECT_FILE,
    };
}

/**
 * Intention to deselect a file.
 */
export const DESELECT_FILE = makeConstant(STATE_BRANCH_NAME, "deselect-file");

export interface DeselectFileAction {
    payload: string | string[];
    type: string;
}

export function deselectFile(fileId: string | string[]): DeselectFileAction {
    return {
        payload: fileId,
        type: DESELECT_FILE,
    };
}
