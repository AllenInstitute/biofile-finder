import FrontendInsights from "@aics/frontend-insights";
import { makeReducer } from "@aics/redux-utils";
import { filter, sortBy, uniqueId } from "lodash";

import {
    HIDE_CONTEXT_MENU,
    HIDE_DATASET_DETAILS_PANEL,
    HIDE_VISIBLE_MODAL,
    REFRESH,
    REMOVE_STATUS,
    SET_USER_SELECTED_APPLICATIONS,
    INITIALIZE_APP,
    SET_STATUS,
    SET_VISIBLE_MODAL,
    SHOW_CONTEXT_MENU,
    SHOW_DATASET_DETAILS_PANEL,
    SHOW_MANIFEST_DOWNLOAD_DIALOG,
    SHOW_COPY_FILE_MANIFEST,
    StatusUpdate,
    MARK_AS_USED_APPLICATION_BEFORE,
    MARK_AS_DISMISSED_SMALL_SCREEN_WARNING,
    ShowManifestDownloadDialogAction,
    SET_HAS_UNSAVED_CHANGES,
    SET_IS_AICS_EMPLOYEE,
    PROMPT_FOR_DATA_SOURCE,
    DownloadManifestAction,
    DOWNLOAD_MANIFEST,
    DataSourcePromptInfo,
    PromptForDataSource,
    SET_SELECTED_PUBLIC_DATASET,
    SET_EXTRACT_METADATA_PYTHON_SNIPPET,
    SET_CONVERT_FILES_SNIPPET,
    SetVisibleModalAction,
    SetOriginForProvenance,
    SET_ORIGIN_FOR_PROVENANCE,
    TOGGLE_FILE_DETAILS_PANEL,
    ToggleFileDetailsPanel,
    REFRESH_GRAPH,
    EXPAND_GRAPH,
    SetIsGraphLoading,
    SET_IS_GRAPH_LOADING,
} from "./actions";
import { ContextMenuItem, PositionReference } from "../../components/ContextMenu";
import { ModalType } from "../../components/Modal";
import { Environment } from "../../constants";
import FileFilter from "../../entity/FileFilter";
import { PlatformDependentServices } from "../../services";
import ApplicationInfoServiceNoop from "../../services/ApplicationInfoService/ApplicationInfoServiceNoop";
import FileDownloadServiceNoop from "../../services/FileDownloadService/FileDownloadServiceNoop";
import FileViewerServiceNoop from "../../services/FileViewerService/FileViewerServiceNoop";
import ExecutionEnvServiceNoop from "../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import NotificationServiceNoop from "../../services/NotificationService/NotificationServiceNoop";
import DatabaseServiceNoop from "../../services/DatabaseService/DatabaseServiceNoop";
import PublicDataset from "../../../web/src/entity/PublicDataset";
import FileDetail from "../../entity/FileDetail";

export interface InteractionStateBranch {
    applicationVersion?: string;
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
    contextMenuPositionReference: PositionReference;
    contextMenuOnDismiss?: () => void;
    csvColumns?: string[];
    dataSourceInfoForVisibleModal?: DataSourcePromptInfo;
    datasetDetailsPanelIsVisible: boolean;
    fileForDetailPanel?: FileDetail;
    fileTypeForVisibleModal: "csv" | "json" | "parquet";
    fileFiltersForVisibleModal: FileFilter[];
    environment: "LOCALHOST" | "PRODUCTION" | "STAGING" | "TEST";
    hasDismissedSmallScreenWarning: boolean;
    hasUnsavedChanges: boolean;
    hasUsedApplicationBefore: boolean;
    isAicsEmployee?: boolean;
    isGraphLoading: boolean;
    isOnWeb: boolean;
    graphRefreshKey?: string;
    platformDependentServices: PlatformDependentServices;
    extractMetadataPythonSnippet?: { setup: string; code: string };
    convertFilesSnippet: {
        setup: string;
        code: string;
        options?: Record<string, string>;
    };
    originForProvenance?: FileDetail;
    refreshKey?: string;
    selectedPublicDataset?: PublicDataset;
    status: StatusUpdate[];
    userSelectedApplications?: UserSelectedApplication[];
    visibleModal?: ModalType;
}

export const initialState: InteractionStateBranch = {
    environment: Environment.PRODUCTION,
    contextMenuIsVisible: false,
    contextMenuItems: [],
    // Passed to `ContextualMenu` as `target`. From the "@fluentui/react" docs:
    // "The target that ContextualMenu should try to position itself based on.
    // It can be either an element, a query selector string resolving to a valid element, or a MouseEvent.
    // If a MouseEvent is given, the origin point of the event will be used."
    contextMenuPositionReference: null,
    datasetDetailsPanelIsVisible: false,
    fileFiltersForVisibleModal: [],
    fileTypeForVisibleModal: "csv",
    hasDismissedSmallScreenWarning: false,
    hasUnsavedChanges: false,
    hasUsedApplicationBefore: false,
    isGraphLoading: false,
    isOnWeb: false,
    platformDependentServices: {
        applicationInfoService: new ApplicationInfoServiceNoop(),
        databaseService: new DatabaseServiceNoop(),
        fileDownloadService: new FileDownloadServiceNoop(),
        fileViewerService: new FileViewerServiceNoop(),
        frontendInsights: new FrontendInsights({
            application: {
                // Kept old name to compare usage more easily in Amplitude UI
                name: "FMS File Explorer",
                version: "0.0.0-noop",
            },
        }),
        executionEnvService: new ExecutionEnvServiceNoop(),
        notificationService: new NotificationServiceNoop(),
    },
    extractMetadataPythonSnippet: { setup: "", code: "" },
    convertFilesSnippet: { setup: "", code: "", options: {} },
    status: [],
};

export default makeReducer<InteractionStateBranch>(
    {
        [MARK_AS_USED_APPLICATION_BEFORE]: (state) => ({
            ...state,
            hasUsedApplicationBefore: true,
        }),
        [MARK_AS_DISMISSED_SMALL_SCREEN_WARNING]: (state) => ({
            ...state,
            hasDismissedSmallScreenWarning: true,
        }),
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
            dataSourceForVisibleModal: undefined,
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
        [SET_HAS_UNSAVED_CHANGES]: (state) => ({
            ...state,
            hasUnsavedChanges: true,
        }),
        [SET_IS_AICS_EMPLOYEE]: (state, action) => ({
            ...state,
            isAicsEmployee: action.payload,
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
        [DOWNLOAD_MANIFEST]: (state, action: DownloadManifestAction) => ({
            ...state,
            csvColumns: action.payload.annotations,
        }),
        [EXPAND_GRAPH]: (state) => ({
            ...state,
            isGraphLoading: true,
        }),
        [INITIALIZE_APP]: (state, action) => ({
            ...state,
            environment: action.payload.environment,
        }),
        [SET_ORIGIN_FOR_PROVENANCE]: (state, action: SetOriginForProvenance) => ({
            ...state,
            fileForDetailPanel: undefined,
            originForProvenance: action.payload,
        }),
        [SET_VISIBLE_MODAL]: (state, action: SetVisibleModalAction) => ({
            ...state,
            fileFiltersForVisibleModal: action.payload.fileFiltersForVisibleModal,
            visibleModal: action.payload.visibleModal,
        }),
        [SHOW_MANIFEST_DOWNLOAD_DIALOG]: (state, action: ShowManifestDownloadDialogAction) => ({
            ...state,
            visibleModal: ModalType.MetadataManifest,
            fileTypeForVisibleModal: action.payload.fileType,
            fileFiltersForVisibleModal: action.payload.fileFilters,
        }),
        [PROMPT_FOR_DATA_SOURCE]: (state, action: PromptForDataSource) => ({
            ...state,
            visibleModal: ModalType.DataSource,
            dataSourceInfoForVisibleModal: action.payload,
        }),
        [SHOW_DATASET_DETAILS_PANEL]: (state) => ({
            ...state,
            datasetDetailsPanelIsVisible: true,
        }),
        [HIDE_DATASET_DETAILS_PANEL]: (state) => ({
            ...state,
            datasetDetailsPanelIsVisible: false,
        }),
        [SET_SELECTED_PUBLIC_DATASET]: (state, action) => ({
            ...state,
            selectedPublicDataset: action.payload,
        }),
        [SHOW_COPY_FILE_MANIFEST]: (state) => ({
            ...state,
            visibleModal: ModalType.CopyFileManifest,
        }),
        [SET_EXTRACT_METADATA_PYTHON_SNIPPET]: (state, action) => ({
            ...state,
            extractMetadataPythonSnippet: {
                setup: action.payload?.setup ?? "",
                code: action.payload?.code ?? "",
            },
        }),
        [SET_CONVERT_FILES_SNIPPET]: (state, action) => ({
            ...state,
            convertFilesSnippet: {
                setup: action.payload?.setup ?? state.convertFilesSnippet?.setup ?? "",
                code: action.payload?.code ?? state.convertFilesSnippet?.code ?? "",
                options: {
                    ...(state.convertFilesSnippet?.options || {}),
                    ...(action.payload?.options || {}),
                },
            },
        }),
        [TOGGLE_FILE_DETAILS_PANEL]: (state, action: ToggleFileDetailsPanel) => ({
            ...state,
            fileForDetailPanel: action.payload,
        }),
        [REFRESH_GRAPH]: (state) => ({
            ...state,
            graphRefreshKey: uniqueId(),
            isGraphLoading: false,
        }),
        [SET_IS_GRAPH_LOADING]: (state, action: SetIsGraphLoading) => ({
            ...state,
            isGraphLoading: action.payload.isGraphLoading,
        }),
    },
    initialState
);
