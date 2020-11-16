import { makeReducer } from "@aics/redux-utils";
import { filter } from "lodash";

import {
    GENERATE_PYTHON_SNIPPET,
    HIDE_CONTEXT_MENU,
    HIDE_VISIBLE_MODAL,
    PlatformDependentServices,
    RECEIVE_PYTHON_SNIPPET,
    REMOVE_STATUS,
    SET_ALLEN_MOUNT_POINT,
    SET_APPLICATION_VERSION,
    SET_CSV_COLUMNS,
    SET_FILE_EXPLORER_SERVICE_BASE_URL,
    SET_IMAGE_J_LOCATION,
    SET_PLATFORM_DEPENDENT_SERVICES,
    SET_STATUS,
    SET_VISIBLE_MODAL,
    SHOW_CONTEXT_MENU,
    SHOW_MANIFEST_DOWNLOAD_DIALOG,
    StatusUpdate,
} from "./actions";
import { ContextMenuItem, PositionReference } from "../../containers/ContextMenu";
import { Modal } from "../../containers/DialogModal";
import ApplicationInfoServiceNoop from "../../services/ApplicationInfoService/ApplicationInfoServiceNoop";
import FileDownloadServiceNoop from "../../services/FileDownloadService/FileDownloadServiceNoop";
import FileViewerServiceNoop from "../../services/FileViewerService/FileViewerServiceNoop";
import PersistentConfigServiceNoop from "../../services/PersistentConfigService/PersistentConfigServiceNoop";
import { DEFAULT_CONNECTION_CONFIG } from "../../services/HttpServiceBase";
import FileFilter from "../../entity/FileFilter";
import ExecutionEnvServiceNoop from "../../services/ExecutionEnvService/ExecutionEnvServiceNoop";

export interface InteractionStateBranch {
    allenMountPoint?: string;
    applicationVersion?: string;
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
    contextMenuPositionReference: PositionReference;
    contextMenuOnDismiss?: () => void;
    csvColumns?: string[];
    fileExplorerServiceBaseUrl: string;
    fileFiltersForManifestDownload: FileFilter[];
    imageJExecutable?: string;
    platformDependentServices: PlatformDependentServices;
    pythonSnippet?: string;
    status: StatusUpdate[];
    visibleModal?: Modal;
}

export const initialState = {
    contextMenuIsVisible: false,
    contextMenuItems: [],
    // Passed to `ContextualMenu` as `target`. From the "office-ui-fabric-react" docs:
    // "The target that ContextualMenu should try to position itself based on.
    // It can be either an element, a query selector string resolving to a valid element, or a MouseEvent.
    // If a MouseEvent is given, the origin point of the event will be used."
    contextMenuPositionReference: null,
    fileExplorerServiceBaseUrl: DEFAULT_CONNECTION_CONFIG.baseUrl,
    fileFiltersForManifestDownload: [],
    platformDependentServices: {
        applicationInfoService: new ApplicationInfoServiceNoop(),
        fileDownloadService: new FileDownloadServiceNoop(),
        fileViewerService: new FileViewerServiceNoop(),
        executionEnvService: new ExecutionEnvServiceNoop(),
        persistentConfigService: new PersistentConfigServiceNoop(),
    },
    status: [],
};

export default makeReducer<InteractionStateBranch>(
    {
        [SHOW_CONTEXT_MENU]: (state, action) => ({
            ...state,
            contextMenuIsVisible: true,
            contextMenuItems: action.payload.items,
            contextMenuOnDismiss: action.payload.onDismiss,
            contextMenuPositionReference: action.payload.positionReference,
        }),
        [REMOVE_STATUS]: (state, action) => ({
            ...state,
            status: filter(state.status, (status: StatusUpdate) => status.id !== action.payload.id),
        }),
        [HIDE_CONTEXT_MENU]: (state) => ({
            ...state,
            contextMenuIsVisible: false,
            contextMenuItems: [],
            contextMenuOnDismiss: undefined,
            contextMenuPositionReference: null,
        }),
        [HIDE_VISIBLE_MODAL]: (state) => ({
            ...state,
            visibleModal: undefined,
        }),
        [GENERATE_PYTHON_SNIPPET]: (state) => ({
            ...state,
            pythonSnippet: undefined,
        }),
        [RECEIVE_PYTHON_SNIPPET]: (state, action) => ({
            ...state,
            ...action.payload,
            visibleModal: Modal.PythonSnippet,
        }),
        [SET_STATUS]: (state, action) => ({
            ...state,
            status: [
                ...filter(state.status, (status: StatusUpdate) => status.id !== action.payload.id),
                action.payload,
            ],
        }),
        [SET_ALLEN_MOUNT_POINT]: (state, action) => ({
            ...state,
            ...action.payload,
        }),
        [SET_APPLICATION_VERSION]: (state, action) => ({
            ...state,
            applicationVersion: action.payload,
        }),
        [SET_CSV_COLUMNS]: (state, action) => ({
            ...state,
            csvColumns: action.payload,
        }),
        [SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state, action) => ({
            ...state,
            fileExplorerServiceBaseUrl: action.payload,
        }),
        [SET_IMAGE_J_LOCATION]: (state, action) => ({
            ...state,
            ...action.payload,
        }),
        [SET_PLATFORM_DEPENDENT_SERVICES]: (state, action) => ({
            ...state,
            platformDependentServices: action.payload,
        }),
        [SET_VISIBLE_MODAL]: (state, action) => ({
            ...state,
            ...action.payload,
        }),
        [SHOW_MANIFEST_DOWNLOAD_DIALOG]: (state, action) => ({
            ...state,
            visibleModal: Modal.CsvManifest,
            fileFiltersForManifestDownload: action.payload,
        }),
    },
    initialState
);
