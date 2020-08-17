import { makeConstant } from "@aics/redux-utils";

import { ContextMenuItem, PositionReference } from "../../containers/ContextMenu";
import ApplicationInfoService from "../../services/ApplicationInfoService";
import FileDownloadService from "../../services/FileDownloadService";
import FileFilter from "../../entity/FileFilter";

const STATE_BRANCH_NAME = "interaction";

/**
 * DOWNLOAD_MANIFEST
 */
export const DOWNLOAD_MANIFEST = makeConstant(STATE_BRANCH_NAME, "download-manifest");

export interface DownloadManifestAction {
    payload: FileFilter[] | undefined;
    type: string;
}

export function downloadManifest(fileFilters?: FileFilter[]): DownloadManifestAction {
    return {
        payload: fileFilters,
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
        onDismiss: (() => void) | undefined;
        positionReference: PositionReference;
    };
}

export function showContextMenu(
    items: ContextMenuItem[],
    positionReference: PositionReference,
    onDismiss?: () => void
): ShowContextMenuAction {
    return {
        type: SHOW_CONTEXT_MENU,
        payload: {
            items,
            onDismiss,
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
    applicationInfoService: ApplicationInfoService;
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

export enum ProcessStatus {
    STARTED,
    SUCCEEDED,
    FAILED,
    NOT_SET,
}

export interface StatusUpdate {
    data: {
        msg: string;
        status?: ProcessStatus;
    };
    id: string; // uuid
}

export const SET_STATUS = makeConstant(STATE_BRANCH_NAME, "set-status");
export const REMOVE_STATUS = makeConstant(STATE_BRANCH_NAME, "remove-status");

export interface RemoveStatusAction {
    type: string;
    payload: {
        id: string; // references a StatusUpdate.id
    };
}

export function removeStatus(id: string): RemoveStatusAction {
    return {
        type: REMOVE_STATUS,
        payload: {
            id,
        },
    };
}

/**
 * NOTIFY FOR APPLICATION UPDATE
 *
 * Intention to inform the user that a newer version of the application is available.
 */
export interface PromptUserToUpdateApp {
    type: string;
    payload: StatusUpdate;
}

export function promptUserToUpdateApp(id: string, msg: string): PromptUserToUpdateApp {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
            },
            id,
        },
    };
}

/**
 * MANIFEST_DOWNLOAD_START
 *
 * Intention to inform the user of the start of a manifest download.
 */
export interface ManifestDownloadStartAction {
    type: string;
    payload: StatusUpdate;
}

export function startManifestDownload(id: string, msg: string): ManifestDownloadStartAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
                status: ProcessStatus.STARTED,
            },
            id,
        },
    };
}

/**
 * MANIFEST_DOWNLOAD_SUCCESS
 *
 * Intention to inform the user of the success of a manifest download.
 */
export interface ManifestDownloadSuccessAction {
    type: string;
    payload: StatusUpdate;
}

export function succeedManifestDownload(id: string, msg: string): ManifestDownloadSuccessAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
                status: ProcessStatus.SUCCEEDED,
            },
            id,
        },
    };
}

/**
 * MANIFEST_DOWNLOAD_FAILURE
 *
 * Intention to inform the user of a failure in a download of a manifest.
 */
export interface ManifestDownloadFailureAction {
    type: string;
    payload: StatusUpdate;
}

export function failManifestDownload(id: string, msg: string): ManifestDownloadFailureAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
                status: ProcessStatus.FAILED,
            },
            id,
        },
    };
}
