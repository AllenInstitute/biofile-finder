import FrontendInsights from "@aics/frontend-insights";
import { makeReducer } from "@aics/redux-utils";
import { filter, sortBy } from "lodash";

import {
    GENERATE_PYTHON_SNIPPET,
    HIDE_CONTEXT_MENU,
    HIDE_VISIBLE_MODAL,
    PlatformDependentServices,
    REFRESH,
    REMOVE_STATUS,
    SET_USER_SELECTED_APPLICATIONS,
    SET_ALLEN_MOUNT_POINT,
    SET_CSV_COLUMNS,
    SET_FILE_EXPLORER_SERVICE_BASE_URL,
    SET_PLATFORM_DEPENDENT_SERVICES,
    SET_STATUS,
    SET_VISIBLE_MODAL,
    SHOW_CONTEXT_MENU,
    SHOW_GENERATE_FILE_SET_DIALOG,
    SHOW_MANIFEST_DOWNLOAD_DIALOG,
    StatusUpdate,
    SUCCEED_PYTHON_SNIPPET_GENERATION,
    SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION,
} from "./actions";
import { ContextMenuItem, PositionReference } from "../../components/ContextMenu";
import { ModalType } from "../../components/Modal";
import ApplicationInfoServiceNoop from "../../services/ApplicationInfoService/ApplicationInfoServiceNoop";
import { PythonicDataAccessSnippet } from "../../services/DatasetService";
import FileDownloadServiceNoop from "../../services/FileDownloadService/FileDownloadServiceNoop";
import FileViewerServiceNoop from "../../services/FileViewerService/FileViewerServiceNoop";
import PersistentConfigServiceNoop from "../../services/PersistentConfigService/PersistentConfigServiceNoop";
import { DEFAULT_CONNECTION_CONFIG } from "../../services/HttpServiceBase";
import FileFilter from "../../entity/FileFilter";
import ExecutionEnvServiceNoop from "../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import NotificationServiceNoop from "../../services/NotificationService/NotificationServiceNoop";

export interface InteractionStateBranch {
    allenMountPoint?: string;
    applicationVersion?: string;
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
    contextMenuPositionReference: PositionReference;
    contextMenuOnDismiss?: () => void;
    csvColumns?: string[];
    fileExplorerServiceBaseUrl: string;
    fileFiltersForVisibleModal: FileFilter[];
    platformDependentServices: PlatformDependentServices;
    pythonSnippet?: PythonicDataAccessSnippet;
    refreshKey?: string;
    status: StatusUpdate[];
    userSelectedApplications?: UserSelectedApplication[];
    visibleModal?: ModalType;
}

export const initialState = {
    contextMenuIsVisible: false,
    contextMenuItems: [],
    // Passed to `ContextualMenu` as `target`. From the "@fluentui/react" docs:
    // "The target that ContextualMenu should try to position itself based on.
    // It can be either an element, a query selector string resolving to a valid element, or a MouseEvent.
    // If a MouseEvent is given, the origin point of the event will be used."
    contextMenuPositionReference: null,
    fileExplorerServiceBaseUrl: DEFAULT_CONNECTION_CONFIG.baseUrl,
    fileFiltersForVisibleModal: [],
    platformDependentServices: {
        applicationInfoService: new ApplicationInfoServiceNoop(),
        fileDownloadService: new FileDownloadServiceNoop(),
        fileViewerService: new FileViewerServiceNoop(),
        frontendInsights: new FrontendInsights({
            application: {
                name: "FMS File Explorer",
                version: "0.0.0-noop",
            },
        }),
        executionEnvService: new ExecutionEnvServiceNoop(),
        notificationService: new NotificationServiceNoop(),
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
            status: filter(
                state.status,
                (status: StatusUpdate) => status.processId !== action.payload.processId
            ),
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
            visibleModal: undefined,
        }),
        [REFRESH]: (state, action) => ({
            ...state,
            refreshKey: action.payload,
        }),
        [SET_USER_SELECTED_APPLICATIONS]: (state, action) => ({
            ...state,
            userSelectedApplications: action.payload,
        }),
        [SET_STATUS]: (state, action) => ({
            ...state,
            status: sortBy(
                [
                    ...filter(
                        state.status,
                        (status: StatusUpdate) => status.processId !== action.payload.processId
                    ),
                    action.payload,
                ],
                "processId"
            ),
        }),
        [SET_ALLEN_MOUNT_POINT]: (state, action) => ({
            ...state,
            ...action.payload,
        }),
        [SET_CSV_COLUMNS]: (state, action) => ({
            ...state,
            csvColumns: action.payload,
        }),
        [SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state, action) => ({
            ...state,
            fileExplorerServiceBaseUrl: action.payload,
        }),
        [SET_PLATFORM_DEPENDENT_SERVICES]: (state, action) => {
            const platformDependentServices: PlatformDependentServices = {
                ...state.platformDependentServices,
                ...action.payload,
            };

            return {
                ...state,
                applicationVersion: platformDependentServices.applicationInfoService.getApplicationVersion(),
                platformDependentServices,
            };
        },
        [SET_VISIBLE_MODAL]: (state, action) => ({
            ...state,
            ...action.payload,
            fileFiltersForVisibleModal: [],
        }),
        [SHOW_GENERATE_FILE_SET_DIALOG]: (state, action) => ({
            ...state,
            visibleModal: ModalType.FileSetForm,
            fileFiltersForVisibleModal: action.payload,
        }),
        [SHOW_MANIFEST_DOWNLOAD_DIALOG]: (state, action) => ({
            ...state,
            visibleModal: ModalType.CsvManifest,
            fileFiltersForVisibleModal: action.payload,
        }),
        [SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION]: (state, action) => ({
            ...state,
            status: sortBy(
                [
                    ...filter(
                        state.status,
                        (status: StatusUpdate) => status.processId !== action.payload.processId
                    ),
                    action.payload.statusUpdate,
                ],
                "processId"
            ),
        }),
        [SUCCEED_PYTHON_SNIPPET_GENERATION]: (state, action) => ({
            ...state,
            pythonSnippet: action.payload.pythonSnippet,
            status: filter(
                state.status,
                (status: StatusUpdate) => status.processId !== action.payload.processId
            ),
            visibleModal: ModalType.PythonSnippet,
        }),
    },
    initialState
);
