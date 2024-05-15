import FrontendInsights from "@aics/frontend-insights";
import { makeConstant } from "@aics/redux-utils";
import { uniqueId } from "lodash";

import Annotation from "../../entity/Annotation";
import ApplicationInfoService from "../../services/ApplicationInfoService";
import { ContextMenuItem, PositionReference } from "../../components/ContextMenu";
import ExecutionEnvService from "../../services/ExecutionEnvService";
import FileDownloadService from "../../services/FileDownloadService";
import FileFilter from "../../entity/FileFilter";
import FileViewerService from "../../services/FileViewerService";
import { ModalType } from "../../components/Modal";
import PersistentConfigService, {
    UserSelectedApplication,
} from "../../services/PersistentConfigService";
import { DatabaseService, NotificationService } from "../../services";
import FileDetail from "../../entity/FileDetail";

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
 * CANCEL_FILE_DOWNLOAD
 *
 * Intention to cancel an in-progress file download.
 */
export const CANCEL_FILE_DOWNLOAD = makeConstant(STATE_BRANCH_NAME, "cancel-file-download");

export interface CancelFileDownloadAction {
    payload: {
        downloadProcessId: string;
    };
    type: string;
}

export function cancelFileDownload(id: string): CancelFileDownloadAction {
    return {
        payload: {
            downloadProcessId: id,
        },
        type: CANCEL_FILE_DOWNLOAD,
    };
}

/**
 * DOWNLOAD_FILES
 *
 * Intention to download files to local disk.
 */
export const DOWNLOAD_FILES = makeConstant(STATE_BRANCH_NAME, "download-files");

export interface DownloadFilesAction {
    payload: {
        files?: FileDetail[];
        shouldPromptForDownloadDirectory: boolean;
    };
    type: string;
}

export function downloadFiles(
    files?: FileDetail[],
    shouldPromptForDownloadDirectory = false
): DownloadFilesAction {
    return {
        payload: {
            files,
            shouldPromptForDownloadDirectory,
        },
        type: DOWNLOAD_FILES,
    };
}

/**
 * MARK_AS_USED_APPLICATION_BEFORE
 *
 * Intention to mark application as having been used by user before
 */

export const MARK_AS_USED_APPLICATION_BEFORE = makeConstant(
    STATE_BRANCH_NAME,
    "mark-as-used-application-before"
);

export interface MarkAsUsedApplicationBefore {
    type: string;
}

export function markAsUsedApplicationBefore(): MarkAsUsedApplicationBefore {
    return {
        type: MARK_AS_USED_APPLICATION_BEFORE,
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
 * Intention is to set whether the current user is an AICS employee
 */
export const SET_IS_AICS_EMPLOYEE = makeConstant(
    STATE_BRANCH_NAME,
    "set-is-aics-employee"
);

export interface SetIsAicsEmployee {
    type: string;
    payload: boolean;
}

export function setIsAicsEmployee(isAicsEmployee: boolean): SetIsAicsEmployee {
    return {
        type: SET_IS_AICS_EMPLOYEE,
        payload: isAicsEmployee,
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
 * PROCESS AND STATUS RELATED ENUMS, INTERFACES, ETC.
 */

export enum ProcessStatus {
    STARTED,
    PROGRESS,
    SUCCEEDED,
    FAILED,
    NOT_SET,
}

export interface StatusUpdate {
    data: {
        fileId?: string[]; // if relevant/applicable, fileid(s) related to this status update
        msg: string;
        status?: ProcessStatus;
        progress?: number; // num in range [0, 1] indicating progress
    };
    processId: string; // uuid
    onCancel?: () => void;
}

export const SET_STATUS = makeConstant(STATE_BRANCH_NAME, "set-status");
export const REMOVE_STATUS = makeConstant(STATE_BRANCH_NAME, "remove-status");

export interface RemoveStatusAction {
    type: string;
    payload: {
        processId: string; // references a StatusUpdate.id
    };
}

export function removeStatus(processId: string): RemoveStatusAction {
    return {
        type: REMOVE_STATUS,
        payload: {
            processId,
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

export function promptUserToUpdateApp(processId: string, msg: string): PromptUserToUpdateApp {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
            },
            processId,
        },
    };
}

/**
 * START PROCESS
 *
 * Intention to inform the user of the start of a (potentially long-running) process.
 */
export interface ProcessStartAction {
    type: string;
    payload: StatusUpdate;
}

export function processStart(
    processId: string,
    msg: string,
    onCancel?: () => void,
    fileId?: string[]
): ProcessStartAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                fileId,
                msg,
                status: ProcessStatus.STARTED,
            },
            processId,
            onCancel,
        },
    };
}

/**
 * PROCESS PROGRESS
 *
 * Intention to inform the user of progress toward a (potentially long-running) process.
 */
export interface ProcessProgressAction {
    type: string;
    payload: StatusUpdate;
}

export function processProgress(
    processId: string,
    progress: number,
    msg: string,
    onCancel: () => void,
    fileId?: string[]
): ProcessProgressAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                fileId,
                msg,
                status: ProcessStatus.PROGRESS,
                progress,
            },
            processId,
            onCancel,
        },
    };
}

/**
 * PROCESS SUCCESS
 *
 * Intention to inform the user of the success of a (potentially long-running) process.
 */
export interface ProcessSuccessAction {
    type: string;
    payload: StatusUpdate;
}

export function processSuccess(processId: string, msg: string): ProcessSuccessAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
                status: ProcessStatus.SUCCEEDED,
            },
            processId,
        },
    };
}

/**
 * PROCESS FAILURE
 *
 * Intention to inform the user of a failure in a (potentially long-running) process.
 */
export interface ProcessFailureAction {
    type: string;
    payload: StatusUpdate;
}

export function processFailure(processId: string, msg: string): ProcessFailureAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
                status: ProcessStatus.FAILED,
            },
            processId,
        },
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
    payload: {
        fileFilters: FileFilter[];
        fileType: "csv" | "parquet" | "json";
    };
}

export function showManifestDownloadDialog(
    fileType: "csv" | "parquet" | "json",
    fileFilters: FileFilter[] = []
): ShowManifestDownloadDialogAction {
    return {
        type: SHOW_MANIFEST_DOWNLOAD_DIALOG,
        payload: {
            fileFilters,
            fileType,
        },
    };
}

/**
 * PROMPT_FOR_NEW_EXECUTABLE
 *
 * Intention to prompt the user for a new executable to use
 */
export const PROMPT_FOR_NEW_EXECUTABLE = makeConstant(
    STATE_BRANCH_NAME,
    "prompt-for-new-executable"
);

export interface PromptForNewExecutable {
    type: string;
    payload?: FileFilter[];
}

export function promptForNewExecutable(filters?: FileFilter[]) {
    return {
        type: PROMPT_FOR_NEW_EXECUTABLE,
        payload: filters,
    };
}

/**
 * SET_USER_SELECTED_APPLICATIONS
 *
 * Intention to set the applications pre-selected by the user
 */
export const SET_USER_SELECTED_APPLICATIONS = makeConstant(
    STATE_BRANCH_NAME,
    "set-user-selected-applications"
);

export interface SetUserSelectedApplication {
    payload: UserSelectedApplication[];
    type: string;
}

export function setUserSelectedApplication(
    apps: UserSelectedApplication[]
): SetUserSelectedApplication {
    return {
        payload: apps,
        type: SET_USER_SELECTED_APPLICATIONS,
    };
}

/**
 * OPEN_WITH_DEFAULT
 *
 * Intention to open selected files with the default application either
 * previously selected by the user or defaulted to by the user's system
 */
export const OPEN_WITH_DEFAULT = makeConstant(STATE_BRANCH_NAME, "open-with-default");

export interface OpenWithDefaultAction {
    payload: {
        files?: FileDetail[];
        filters?: FileFilter[];
    };
    type: string;
}

export function openWithDefault(
    filters?: FileFilter[],
    files?: FileDetail[]
): OpenWithDefaultAction {
    return {
        payload: { files, filters },
        type: OPEN_WITH_DEFAULT,
    };
}

/**
 * OPEN_WITH
 *
 * Intention to open selected files with application found at path given
 */
export const OPEN_WITH = makeConstant(STATE_BRANCH_NAME, "open-with");

export interface OpenWithAction {
    payload: {
        app: UserSelectedApplication;
        filters?: FileFilter[];
        files?: FileDetail[];
    };
    type: string;
}

export function openWith(
    app: UserSelectedApplication,
    filters?: FileFilter[],
    files?: FileDetail[]
): OpenWithAction {
    return {
        payload: {
            app,
            filters,
            files,
        },
        type: OPEN_WITH,
    };
}

/**
 * BROWSE_FOR_NEW_DATA_SOURCE
 *
 * Intention to prompt the user to browse for a new data source.
 */
export const BROWSE_FOR_NEW_DATA_SOURCE = makeConstant(
    STATE_BRANCH_NAME,
    "browse-for-new-data-source"
);

export interface BrowseForNewDataSourceAction {
    type: string;
}

export function browseForNewDataSource(): BrowseForNewDataSourceAction {
    return {
        type: BROWSE_FOR_NEW_DATA_SOURCE,
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
