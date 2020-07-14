import { makeConstant } from "@aics/redux-utils";

import { ContextMenuItem, PositionReference } from "../../containers/ContextMenu";
import FileDownloadService from "../../services/FileDownloadService";

const STATE_BRANCH_NAME = "interaction";

/**
 * DOWNLOAD_MANIFEST
 */
export const DOWNLOAD_MANIFEST = makeConstant(STATE_BRANCH_NAME, "download-manifest");

export interface DownloadManifestAction {
    type: string;
}

export function downloadManifest(): DownloadManifestAction {
    return {
        type: DOWNLOAD_MANIFEST,
    };
}

/**
 * SHOW_CONTEXT_MENU
 *
 * Intention to show context menu.
 */
export const SHOW_CONTEXT_MENU = makeConstant(STATE_BRANCH_NAME, "show-context-menu");

export interface ShowContextMenuAction {
    type: string;
    payload: {
        items: ContextMenuItem[];
        positionReference: PositionReference;
    };
}

export function showContextMenu(
    items: ContextMenuItem[],
    positionReference: PositionReference
): ShowContextMenuAction {
    return {
        type: SHOW_CONTEXT_MENU,
        payload: {
            items,
            positionReference,
        },
    };
}

/**
 * HIDE_CONTEXT_MENU
 *
 * Intention to hide context menu.
 */
export const HIDE_CONTEXT_MENU = makeConstant(STATE_BRANCH_NAME, "hide-context-menu");

export interface HideContextMenuAction {
    type: string;
}

export function hideContextMenu(): HideContextMenuAction {
    return {
        type: HIDE_CONTEXT_MENU,
    };
}

/**
 * SET CONNECTION CONFIGURATION FOR THE FILE EXPLORER SERVICE
 */
export const SET_FILE_EXPLORER_SERVICE_BASE_URL = makeConstant(
    STATE_BRANCH_NAME,
    "set-file-explorer-service-connection-config"
);

export interface SetFileExplorerServiceBaseUrl {
    type: string;
    payload: string;
}

export function setFileExplorerServiceBaseUrl(baseUrl: string): SetFileExplorerServiceBaseUrl {
    return {
        type: SET_FILE_EXPLORER_SERVICE_BASE_URL,
        payload: baseUrl,
    };
}

/**
 * SET PLATFORM-DEPENDENT SERVICES
 *
 * These services provide platform-dependent functionality and are expected to be injected once on application load.
 */
export const SET_PLATFORM_DEPENDENT_SERVICES = makeConstant(
    STATE_BRANCH_NAME,
    "set-platform-dependent-services"
);

export interface PlatformDependentServices {
    fileDownloadService: FileDownloadService;
}

export interface SetPlatformDependentServices {
    type: string;
    payload: PlatformDependentServices;
}

export function setPlatformDependentServices(
    services: PlatformDependentServices
): SetPlatformDependentServices {
    return {
        type: SET_PLATFORM_DEPENDENT_SERVICES,
        payload: services,
    };
}

/**
 * PROCESS AND STATUS RELATED ENUMS, INTERFACES, ETC.
 */

export enum Process {
    MANIFEST_DOWNLOAD,
}

export enum ProcessStatus {
    STARTED,
    SUCCEEDED,
    FAILED,
}

export interface StatusUpdate {
    id: string; // uuid
    process: Process;
    status: ProcessStatus;
}

export const SET_STATUS = makeConstant(STATE_BRANCH_NAME, "set-status");
export const CLEAR_STATUS = makeConstant(STATE_BRANCH_NAME, "clear-status");

export interface ClearStatusAction {
    type: string;
    payload: {
        id: string; // references a StatusUpdate.id
    };
}

export function clearStatus(id: string): ClearStatusAction {
    return {
        type: CLEAR_STATUS,
        payload: {
            id,
        },
    };
}

/**
 * MANIFEST_DOWNLOAD_START
 *
 * Intention to ...
 */
export interface ManifestDownloadStartAction {
    type: string;
    payload: StatusUpdate;
}

export function startManifestDownload(id: string): ManifestDownloadStartAction {
    return {
        type: SET_STATUS,
        payload: {
            id,
            process: Process.MANIFEST_DOWNLOAD,
            status: ProcessStatus.STARTED,
        },
    };
}

/**
 * MANIFEST_DOWNLOAD_SUCCESS
 *
 * Intention to ...
 */
export interface ManifestDownloadSuccessAction {
    type: string;
    payload: StatusUpdate;
}

export function succeedManifestDownload(id: string): ManifestDownloadSuccessAction {
    return {
        type: SET_STATUS,
        payload: {
            id,
            process: Process.MANIFEST_DOWNLOAD,
            status: ProcessStatus.SUCCEEDED,
        },
    };
}

/**
 * MANIFEST_DOWNLOAD_FAILURE
 *
 * Intention to ...
 */
export interface ManifestDownloadFailureAction {
    type: string;
    payload: StatusUpdate;
}

export function failManifestDownload(id: string): ManifestDownloadFailureAction {
    return {
        type: SET_STATUS,
        payload: {
            id,
            process: Process.MANIFEST_DOWNLOAD,
            status: ProcessStatus.FAILED,
        },
    };
}
