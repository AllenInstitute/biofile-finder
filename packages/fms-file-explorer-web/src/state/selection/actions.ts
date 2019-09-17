import { DESELECT_FILE, SELECT_FILE, SELECT_METADATA } from "./constants";
import { DeselectFileAction, SelectFileAction, SelectMetadataAction } from "./types";

export function selectFile(fileId: string | string[]): SelectFileAction {
    return {
        payload: fileId,
        type: SELECT_FILE,
    };
}

export function deselectFile(fileId: string | string[]): DeselectFileAction {
    return {
        payload: fileId,
        type: DESELECT_FILE,
    };
}

export function selectMetadata(key: string, payload: string | number): SelectMetadataAction {
    return {
        key,
        payload,
        type: SELECT_METADATA,
    };
}
