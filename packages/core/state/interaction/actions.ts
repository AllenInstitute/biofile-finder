import { makeConstant } from "@aics/redux-utils";
import { uniqueId } from "lodash";

import { ContextMenuItem, PositionReference } from "../../components/ContextMenu";
import FileFilter from "../../entity/FileFilter";
import { ModalType } from "../../components/Modal";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import FileDetail from "../../entity/FileDetail";
import { Source } from "../../entity/FileExplorerURL";
import { FileInfo } from "../../services";
import PublicDataset from "../../../web/src/entity/PublicDataset";

const STATE_BRANCH_NAME = "interaction";

/**
 * PROMPT_FOR_DATA_SOURCE
 *
 * Intention to prompt the user for a data source; this is largely necessarily for replacing a data source
 * that has expired or is otherwise no longer available.
 */
export const PROMPT_FOR_DATA_SOURCE = makeConstant(STATE_BRANCH_NAME, "prompt-for-data-source");

type PartialSource = Omit<Source, "type">;

export interface DataSourcePromptInfo {
    source?: PartialSource;
    query?: string;
}

export interface PromptForDataSource {
    type: string;
    payload: DataSourcePromptInfo;
}

export function promptForDataSource(info: DataSourcePromptInfo): PromptForDataSource {
    return {
        type: PROMPT_FOR_DATA_SOURCE,
        payload: info,
    };
}

/**
 * DOWNLOAD_MANIFEST
 */
export const DOWNLOAD_MANIFEST = makeConstant(STATE_BRANCH_NAME, "download-manifest");

export interface DownloadManifestAction {
    payload: {
        annotations: string[];
        type: "csv" | "parquet" | "json";
    };
    type: string;
}

export function downloadManifest(
    annotations: string[],
    type: "csv" | "json" | "parquet"
): DownloadManifestAction {
    return {
        payload: {
            annotations,
            type,
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
    payload?: FileInfo[];
    type: string;
}

export function downloadFiles(files?: FileInfo[]): DownloadFilesAction {
    return {
        payload: files,
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
 * MARK_AS_DISMISSED_SMALL_SCREEN_WARNING
 *
 * Intention to mark that user selected not to show small screen warning again
 */

export const MARK_AS_DISMISSED_SMALL_SCREEN_WARNING = makeConstant(
    STATE_BRANCH_NAME,
    "mark-as-dismissed-small-screen-warning"
);

export interface MarkAsDismissedSmallScreenWarning {
    type: string;
}

export function markAsDismissedSmallScreenWarning(): MarkAsDismissedSmallScreenWarning {
    return {
        type: MARK_AS_DISMISSED_SMALL_SCREEN_WARNING,
    };
}

/**
 * SET_IS_SMALL_SCREEN
 *
 * Intention to respond to screen size changes
 */
export const SET_IS_SMALL_SCREEN = makeConstant(STATE_BRANCH_NAME, "set-is-small-screen");

export interface SetIsSmallScreenAction {
    payload: boolean;
    type: string;
}

export function setIsSmallScreen(isSmallScreen: boolean): SetIsSmallScreenAction {
    return {
        payload: isSmallScreen,
        type: SET_IS_SMALL_SCREEN,
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
export const SET_IS_AICS_EMPLOYEE = makeConstant(STATE_BRANCH_NAME, "set-is-aics-employee");

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
 * Set connection configuration and kick off any tasks to initialize the app
 */
export const INITIALIZE_APP = makeConstant(STATE_BRANCH_NAME, "initialize-app");

export interface InitializeApp {
    type: string;
    payload: string;
}

export const initializeApp = (payload: { environment: string }) => ({
    type: INITIALIZE_APP,
    payload,
});

/**
 * PROCESS AND STATUS RELATED ENUMS, INTERFACES, ETC.
 */

export enum ProcessStatus {
    STARTED,
    PROGRESS,
    SUCCEEDED,
    NOT_SET,
    WARNING,
    ERROR,
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
 * PROCESS ERROR
 *
 * Intention to inform the user of an error generated by the system or
 * a failure in a (potentially long-running) process
 */
export interface ProcessErrorAction {
    type: string;
    payload: StatusUpdate;
}

export function processError(processId: string, msg: string): ProcessErrorAction {
    return {
        type: SET_STATUS,
        payload: {
            data: {
                msg,
                status: ProcessStatus.ERROR,
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

// todo should these go here?
/**
 * OPEN_NATIVE_FILE_BROWSER
 *
 * Open the user's native file browser. Only works in desktop mode.
 */
export const OPEN_NATIVE_FILE_BROWSER = makeConstant(STATE_BRANCH_NAME, "open-native-file-browser");

export interface OpenNativeFileBrowserAction {
    type: string;
    payload: {
        fileDetails: FileDetail;
    };
}

export function openNativeFileBrowser(fileDetails: FileDetail): OpenNativeFileBrowserAction {
    return {
        type: OPEN_NATIVE_FILE_BROWSER,
        payload: {
            fileDetails,
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

/**
 * HIDE_DATASET_DETAILS_PANEL
 *
 * Intention to hide dataset details panel.
 * Used in web only
 */
export const HIDE_DATASET_DETAILS_PANEL = makeConstant(
    STATE_BRANCH_NAME,
    "hide-dataset-details-panel"
);

export interface HideDatasetDetailsPanelAction {
    type: string;
}

export function hideDatasetDetailsPanel(): HideDatasetDetailsPanelAction {
    return {
        type: HIDE_DATASET_DETAILS_PANEL,
    };
}

/**
 * SHOW_DATASET_DETAILS_PANEL
 *
 * Intention to show dataset details panel.
 * Used in web only
 */
export const SHOW_DATASET_DETAILS_PANEL = makeConstant(
    STATE_BRANCH_NAME,
    "show-dataset-details-panel"
);

export interface ShowDatasetDetailsPanelAction {
    type: string;
}

export function showDatasetDetailsPanel(): ShowDatasetDetailsPanelAction {
    return {
        type: SHOW_DATASET_DETAILS_PANEL,
    };
}

/**
 * SET_SELECTED_PUBLIC_DATASET
 *
 * Intention to select an open-source dataset to view.
 * Used in web only
 */
export const SET_SELECTED_PUBLIC_DATASET = makeConstant(
    STATE_BRANCH_NAME,
    "set-selected-public-dataset"
);

export interface SetSelectedPublicDataset {
    payload: PublicDataset;
    type: string;
}

export function setSelectedPublicDataset(dataset: PublicDataset): SetSelectedPublicDataset {
    return {
        payload: dataset,
        type: SET_SELECTED_PUBLIC_DATASET,
    };
}

/**
 * SHOW_COPY_FILE_MANIFEST
 *
 * Action to show the Copy File dialog (manifest) for NAS cache operations.
 * This modal will allow users to copy files onto the NAS cache.
 */
export const SHOW_COPY_FILE_MANIFEST = makeConstant(STATE_BRANCH_NAME, "show-copy-file-manifest");

export interface ShowCopyFileManifestAction {
    type: string;
}

export function showCopyFileManifest(): ShowCopyFileManifestAction {
    return {
        type: SHOW_COPY_FILE_MANIFEST,
    };
}

export const COPY_FILES = makeConstant(STATE_BRANCH_NAME, "copy-files");

export interface CopyFilesAction {
    type: string;
    payload: {
        fileDetails: FileDetail[];
    };
}

export function copyFiles(fileDetails: FileDetail[]): CopyFilesAction {
    return {
        type: COPY_FILES,
        payload: {
            fileDetails,
        },
    };
}
