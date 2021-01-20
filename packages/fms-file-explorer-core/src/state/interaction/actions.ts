import { makeConstant } from "@aics/redux-utils";
import { uniqueId } from "lodash";

import Annotation from "../../entity/Annotation";
import ApplicationInfoService from "../../services/ApplicationInfoService";
import { ContextMenuItem, PositionReference } from "../../containers/ContextMenu";
import { PythonicDataAccessSnippet } from "../../services/DatasetService";
import ExecutionEnvService from "../../services/ExecutionEnvService";
import FileDownloadService from "../../services/FileDownloadService";
import FileFilter from "../../entity/FileFilter";
import FileViewerService from "../../services/FileViewerService";
import { ModalType } from "../../containers/Modal";
import PersistentConfigService from "../../services/PersistentConfigService";

const STATE_BRANCH_NAME = "interaction";

/**
 * DOWNLOAD_MANIFEST
 */
export const DOWNLOAD_MANIFEST = makeConstant(STATE_BRANCH_NAME, "download-manifest");

export interface DownloadManifestAction {
    payload: {
        annotations: Annotation[];
    };
    type: string;
}

export function downloadManifest(annotations: Annotation[]): DownloadManifestAction {
    return {
        payload: {
            annotations,
        },
        type: DOWNLOAD_MANIFEST,
    };
}

/**
 * CANCEL_MANIFEST_DOWNLOAD
 *
 * Intention to cancel a running manifest download.
 */
export const CANCEL_MANIFEST_DOWNLOAD = makeConstant(STATE_BRANCH_NAME, "cancel-manifest-download");

export interface CancelManifestDownloadAction {
    payload: {
        id: string;
    };
    type: string;
}

export function cancelManifestDownload(id: string): CancelManifestDownloadAction {
    return {
        payload: {
            id,
        },
        type: CANCEL_MANIFEST_DOWNLOAD,
    };
}

/**
 * SET_ALLEN_MOUNT_POINT
 *
 * Intention to set the allen mount point.
 */
export const SET_ALLEN_MOUNT_POINT = makeConstant(STATE_BRANCH_NAME, "set-allen-mount-point");

export interface SetAllenMountPointAction {
    payload: {
        allenMountPoint: string;
    };
    type: string;
}

export function setAllenMountPoint(allenMountPoint: string): SetAllenMountPointAction {
    return {
        payload: {
            allenMountPoint,
        },
        type: SET_ALLEN_MOUNT_POINT,
    };
}

/**
 * SET_CSV_COLUMNS
 *
 * Intention to set the csv columns
 */
export const SET_CSV_COLUMNS = makeConstant(STATE_BRANCH_NAME, "set-csv-columns");

export interface SetCsvColumnsAction {
    payload: string[];
    type: string;
}

export function setCsvColumns(csvColumns: string[]): SetCsvColumnsAction {
    return {
        payload: csvColumns,
        type: SET_CSV_COLUMNS,
    };
}

/**
 * SET_IMAGE_J_LOCATION
 *
 * Intention to set the ImageJ/Fiji location
 */
export const SET_IMAGE_J_LOCATION = makeConstant(STATE_BRANCH_NAME, "set-image-j-location");

export interface SetImageJLocationAction {
    payload: {
        imageJExecutable: string;
    };
    type: string;
}

export function setImageJLocation(imageJExecutable: string): SetImageJLocationAction {
    return {
        payload: {
            imageJExecutable,
        },
        type: SET_IMAGE_J_LOCATION,
    };
}

/**
 * OPEN_FILES_IN_IMAGE_J
 *
 * Intention to open selected files in Image J viewer.
 */
export const OPEN_FILES_IN_IMAGE_J = makeConstant(STATE_BRANCH_NAME, "open-files-in-image-j");

export interface OpenFilesInImageJ {
    type: string;
}

export function openFilesInImageJ(): OpenFilesInImageJ {
    return {
        type: OPEN_FILES_IN_IMAGE_J,
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
 * HIDE_VISIBLE_MODAL
 *
 * Intention to hide the current visible modal (if any).
 */
export const HIDE_VISIBLE_MODAL = makeConstant(STATE_BRANCH_NAME, "hide-visible-modal");

export interface HideVisibleModalAction {
    type: string;
}

export function hideVisibleModal(): HideVisibleModalAction {
    return {
        type: HIDE_VISIBLE_MODAL,
    };
}

/**
 * SET_APPLICATION_VERSION
 *
 * Set application version
 */
export const SET_APPLICATION_VERSION = makeConstant(STATE_BRANCH_NAME, "set-application-version");

export interface SetApplicationVersion {
    type: string;
    payload: string;
}

export function setApplicationVersion(applicationVersion: string): SetApplicationVersion {
    return {
        type: SET_APPLICATION_VERSION,
        payload: applicationVersion,
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
    fileViewerService: FileViewerService;
    executionEnvService: ExecutionEnvService;
    persistentConfigService: PersistentConfigService;
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
    onCancel?: () => void;
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

export function startManifestDownload(
    id: string,
    msg: string,
    onCancel: () => void
): ManifestDownloadStartAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
                status: ProcessStatus.STARTED,
            },
            id,
            onCancel,
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

/**
 * PYTHON_SNIPPET_GENERATION_START
 *
 * Intention to inform the user of the start of a python snippet generation.
 */
export interface StartPythonSnippetGenerationAction {
    type: string;
    payload: StatusUpdate;
}

export function startPythonSnippetGeneration(id: string): StartPythonSnippetGenerationAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg: "Generation of Python snippet is in progress.",
                status: ProcessStatus.STARTED,
            },
            id,
        },
    };
}

/**
 * SUCCEED_PYTHON_SNIPPET_GENERATION
 *
 * Intention to inform the user of the success of a python snippet generation.
 */
export const SUCCEED_PYTHON_SNIPPET_GENERATION = makeConstant(
    STATE_BRANCH_NAME,
    "succeed-python-snippet-generation"
);

export interface SucceedPythonSnippetGeneration {
    type: string;
    payload: {
        id: string;
        pythonSnippet: PythonicDataAccessSnippet;
    };
}

export function succeedPythonSnippetGeneration(
    id: string,
    pythonSnippet: PythonicDataAccessSnippet
): SucceedPythonSnippetGeneration {
    return {
        type: SUCCEED_PYTHON_SNIPPET_GENERATION,
        payload: {
            id,
            pythonSnippet,
        },
    };
}

/**
 * PYTHON_SNIPPET_GENERATION_FAILURE
 *
 * Intention to inform the user of a failure in a download of a manifest.
 */
export interface FailPythonSnippetGenerationAction {
    type: string;
    payload: StatusUpdate;
}

export function failPythonSnippetGeneration(
    id: string,
    msg: string
): FailPythonSnippetGenerationAction {
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

/**
 * SHOW_GENERATE_PYTHON_SNIPPET_DIALOG
 *
 * Intention to show the generate python snippet dialog.
 */
export const SHOW_GENERATE_PYTHON_SNIPPET_DIALOG = makeConstant(
    STATE_BRANCH_NAME,
    "show-generate-python-snippet-dialog"
);

export interface ShowGeneratePythonSnippetDialogAction {
    type: string;
    payload: FileFilter[];
}

export function showGeneratePythonSnippetDialog(
    fileFilters: FileFilter[] = []
): ShowGeneratePythonSnippetDialogAction {
    return {
        type: SHOW_GENERATE_PYTHON_SNIPPET_DIALOG,
        payload: fileFilters,
    };
}

/**
 * SHOW_MANIFEST_DOWNLOAD_DIALOG
 *
 * Intention to show the manifest download dialog.
 */
export const SHOW_MANIFEST_DOWNLOAD_DIALOG = makeConstant(
    STATE_BRANCH_NAME,
    "show-manifest-download-dialog"
);

export interface ShowManifestDownloadDialogAction {
    type: string;
    payload: FileFilter[];
}

export function showManifestDownloadDialog(
    fileFilters: FileFilter[] = []
): ShowManifestDownloadDialogAction {
    return {
        type: SHOW_MANIFEST_DOWNLOAD_DIALOG,
        payload: fileFilters,
    };
}

/**
 * SET_VISIBLE_MODAL
 *
 * Intention to set the current visible modal.
 */
export const SET_VISIBLE_MODAL = makeConstant(STATE_BRANCH_NAME, "set-visible-modal");

export interface SetVisibleModalAction {
    type: string;
    payload: {
        visibleModal: ModalType;
    };
}

export function setVisibleModal(visibleModal: ModalType): SetVisibleModalAction {
    return {
        type: SET_VISIBLE_MODAL,
        payload: { visibleModal },
    };
}

/**
 * GENERATE_PYTHON_SNIPPET
 *
 * Intention to generate a python snippet for a dataset.
 */
export const GENERATE_PYTHON_SNIPPET = makeConstant(STATE_BRANCH_NAME, "generate-python-snippet");

export interface GeneratePythonSnippetAction {
    type: string;
    payload: {
        dataset: string;
        expiration?: Date;
        annotations: Annotation[];
    };
}

export function generatePythonSnippet(
    dataset: string,
    annotations: Annotation[],
    expiration?: Date
): GeneratePythonSnippetAction {
    return {
        type: GENERATE_PYTHON_SNIPPET,
        payload: {
            dataset,
            expiration,
            annotations,
        },
    };
}

/**
 * REFRESH
 *
 * Intention to refresh cached queries
 */

export const REFRESH = makeConstant(STATE_BRANCH_NAME, "refresh");

export interface RefreshAction {
    type: string;
    payload: string;
}

export function refresh(): RefreshAction {
    return {
        type: REFRESH,
        payload: uniqueId(),
    };
}
