import FrontendInsights from "@aics/frontend-insights";
import { makeConstant } from "@aics/redux-utils";
import { uniqueId } from "lodash";

import Annotation from "../../entity/Annotation";
import ApplicationInfoService from "../../services/ApplicationInfoService";
import { ContextMenuItem, PositionReference } from "../../components/ContextMenu";
import { Dataset, PythonicDataAccessSnippet } from "../../services/DatasetService";
import ExecutionEnvService from "../../services/ExecutionEnvService";
import FileDownloadService, { FileInfo } from "../../services/FileDownloadService";
import FileFilter from "../../entity/FileFilter";
import FileViewerService from "../../services/FileViewerService";
import { ModalType } from "../../components/Modal";
import PersistentConfigService, {
    UserSelectedApplication,
} from "../../services/PersistentConfigService";
import { NotificationService } from "../../services";
import { FmsFile } from "../../services/FileService";

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
 * DOWNLOAD_FILE
 *
 * Intention to download a file to local disk.
 */
export const DOWNLOAD_FILE = makeConstant(STATE_BRANCH_NAME, "download-file");

export interface DownloadFileAction {
    payload: FileInfo;
    type: string;
}

export function downloadFile(fileInfo: FileInfo): DownloadFileAction {
    return {
        payload: fileInfo,
        type: DOWNLOAD_FILE,
    };
}

/**
 * DOWNLOAD_SELECTED_FILES
 *
 * Intention to download selected files to local disk.
 */
export const DOWNLOAD_SELECTED_FILES = makeConstant(STATE_BRANCH_NAME, "download-selected-files");

export interface DownloadSelectedFilesAction {
    type: string;
}

export function downloadSelectedFiles(): DownloadSelectedFilesAction {
    return {
        type: DOWNLOAD_SELECTED_FILES,
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
    frontendInsights: FrontendInsights;
    executionEnvService: ExecutionEnvService;
    notificationService: NotificationService;
    persistentConfigService: PersistentConfigService;
}

export interface SetPlatformDependentServices {
    type: string;
    payload: Partial<PlatformDependentServices>;
}

export function setPlatformDependentServices(
    services: Partial<PlatformDependentServices>
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
 * UPDATE_COLLECTION
 *
 * Intention to update the metadata of an existing collection.
 */
export const UPDATE_COLLECTION = makeConstant(STATE_BRANCH_NAME, "update-collection");

export interface UpdateCollectionAction {
    payload?: {
        expiration?: Date;
        private: boolean;
    };
    type: string;
}

export function updateCollection(config?: {
    expiration?: Date;
    private: boolean;
}): UpdateCollectionAction {
    return {
        payload: config,
        type: UPDATE_COLLECTION,
    };
}

/**
 * GENERATE_SHAREABLE_FILE_SELECTION_LINK
 *
 * Intention to generate a shareable link to the selected files.
 */
export const GENERATE_SHAREABLE_FILE_SELECTION_LINK = makeConstant(
    STATE_BRANCH_NAME,
    "generate-shareable-file-selection-link"
);

export interface GenerateShareableFileSelectionLinkAction {
    payload: {
        annotations?: string[];
        expiration?: Date;
        filters?: FileFilter[];
        fixed?: boolean;
        private?: boolean;
        name?: string;
    };
    type: string;
}

export function generateShareableFileSelectionLink(
    config: {
        annotations?: string[];
        expiration?: Date;
        filters?: FileFilter[];
        fixed?: boolean;
        private?: boolean;
        name?: string;
    } = {}
): GenerateShareableFileSelectionLinkAction {
    return {
        payload: config,
        type: GENERATE_SHAREABLE_FILE_SELECTION_LINK,
    };
}

/**
 * SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION
 *
 * Intention to inform user of successful generation of shareable link to selected files.
 */
export const SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION = makeConstant(
    STATE_BRANCH_NAME,
    "succeed-shareable-file-selection-link-generation"
);

export interface SucceedShareableFileSelectionLinkGenerationAction {
    payload: Dataset;
    type: string;
}

export function succeedShareableFileSelectionLinkGeneration(
    collection: Dataset
): SucceedShareableFileSelectionLinkGenerationAction {
    return {
        payload: collection,
        type: SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION,
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
        processId: string;
        pythonSnippet: PythonicDataAccessSnippet;
    };
}

export function succeedPythonSnippetGeneration(
    processId: string,
    pythonSnippet: PythonicDataAccessSnippet
): SucceedPythonSnippetGeneration {
    return {
        type: SUCCEED_PYTHON_SNIPPET_GENERATION,
        payload: {
            processId,
            pythonSnippet,
        },
    };
}

/**
 * SHOW_CREATE_COLLECTION_DIALOG
 *
 * Intention to show the dialog for generating a custom collection.
 */
export const SHOW_CREATE_COLLECTION_DIALOG = makeConstant(
    STATE_BRANCH_NAME,
    "show-create-collection-dialog"
);

export interface ShowCreateCollectionDialogAction {
    type: string;
    payload: FileFilter[];
}

export function showCreateCollectionDialog(
    fileFilters: FileFilter[] = []
): ShowCreateCollectionDialogAction {
    return {
        type: SHOW_CREATE_COLLECTION_DIALOG,
        payload: fileFilters,
    };
}

/**
 * SHOW_EDIT_COLLECTION_DIALOG
 *
 * Intention to show the dialog for editing an existing collection.
 */
export const SHOW_EDIT_COLLECTION_DIALOG = makeConstant(
    STATE_BRANCH_NAME,
    "show-edit-collection-dialog"
);

export interface ShowEditCollectionDialogAction {
    type: string;
}

export function showEditCollectionDialog(): ShowEditCollectionDialogAction {
    return {
        type: SHOW_EDIT_COLLECTION_DIALOG,
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
    payload?: FileFilter[];
    type: string;
}

export function openWithDefault(filters?: FileFilter[]): OpenWithDefaultAction {
    return {
        payload: filters,
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
        files?: FmsFile[];
    };
    type: string;
}

export function openWith(
    app: UserSelectedApplication,
    filters?: FileFilter[],
    files?: FmsFile[]
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
 * GENERATE_PYTHON_SNIPPET
 *
 * Intention to generate a python snippet for a collection.
 */
export const GENERATE_PYTHON_SNIPPET = makeConstant(STATE_BRANCH_NAME, "generate-python-snippet");

export interface GeneratePythonSnippetAction {
    payload: Dataset;
    type: string;
}

export function generatePythonSnippet(collection: Dataset): GeneratePythonSnippetAction {
    return {
        payload: collection,
        type: GENERATE_PYTHON_SNIPPET,
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
