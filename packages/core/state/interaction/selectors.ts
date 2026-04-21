import { createSelector } from "reselect";

import { State } from "../";
import { ModalType } from "../../components/Modal";
import { getDataSources, getEdgeDefinitions } from "../metadata/selectors";
import {
    getSelectedDataSources,
    getPythonConversion,
    getSelectedSourceMetadata,
} from "../selection/selectors";
import { AnnotationService, FileService } from "../../services";
import { DataSource } from "../../services/DataSourceService";
import DatabaseAnnotationService from "../../services/AnnotationService/DatabaseAnnotationService";
import DatabaseFileService from "../../services/FileService/DatabaseFileService";
import Graph from "../../entity/Graph";

// BASIC SELECTORS
export const getEnvironment = (state: State) => state.interaction.environment;
export const getContextMenuVisibility = (state: State) => state.interaction.contextMenuIsVisible;
export const getContextMenuItems = (state: State) => state.interaction.contextMenuItems;
export const getContextMenuPositionReference = (state: State) =>
    state.interaction.contextMenuPositionReference;
export const getContextMenuOnDismiss = (state: State) => state.interaction.contextMenuOnDismiss;
export const getCsvColumns = (state: State) => state.interaction.csvColumns;
export const getDataSourceInfoForVisibleModal = (state: State) =>
    state.interaction.dataSourceInfoForVisibleModal;
export const getDatasetDetailsVisibility = (state: State) =>
    state.interaction.datasetDetailsPanelIsVisible;
export const getGraphRefreshKey = (state: State) => state.interaction.graphRefreshKey;
export const getOriginForProvenance = (state: State) => state.interaction.originForProvenance;
export const getFileFiltersForVisibleModal = (state: State) =>
    state.interaction.fileFiltersForVisibleModal;
export const getFileForDetailPanel = (state: State) => state.interaction.fileForDetailPanel;
export const getFileTypeForVisibleModal = (state: State) =>
    state.interaction.fileTypeForVisibleModal;
export const getHasDismissedSmallScreenWarning = (state: State) =>
    state.interaction.hasDismissedSmallScreenWarning;
export const getHasUnsavedChanges = (state: State) => state.interaction.hasUnsavedChanges;
export const hasUsedApplicationBefore = (state: State) =>
    state.interaction.hasUsedApplicationBefore;
export const isGraphLoading = (state: State) => state.interaction.isGraphLoading;
export const isOnWeb = (state: State) => state.interaction.isOnWeb;
export const isRemoteFileUploadServerAvailable = (state: State) =>
    state.interaction.isRemoteFileUploadServerAvailable;
export const getPlatformDependentServices = (state: State) =>
    state.interaction.platformDependentServices;
export const getProcessStatuses = (state: State) => state.interaction.status;
export const getRefreshKey = (state: State) => state.interaction.refreshKey;
export const getUserSelectedApplications = (state: State) =>
    state.interaction.userSelectedApplications;
export const getVisibleModal = (state: State) => state.interaction.visibleModal;

// COMPOSED SELECTORS
export const getIsDisplayingSmallScreenWarning = createSelector(
    [getVisibleModal],
    (visibleModal): boolean => visibleModal === ModalType.SmallScreenWarning
);

export const getAllDataSources = createSelector(
    [getDataSources],
    (dataSources): DataSource[] => dataSources
);

export const getExtractMetadataPythonSnippet = (state: State) =>
    state.interaction.extractMetadataPythonSnippet;

export const getConvertFilesSnippet = (state: State) => state.interaction.convertFilesSnippet;

export const getPythonSnippet = createSelector([getPythonConversion], (pythonQuery) => {
    const setup = `pip install \"pandas>=1.5\"`;
    const code = `${pythonQuery}`;
    return { setup, code };
});

export const getFileService = createSelector(
    [getSelectedDataSources, getPlatformDependentServices, getRefreshKey],
    (dataSourceNames, platformDependentServices): FileService =>
        new DatabaseFileService({
            databaseService: platformDependentServices.databaseService,
            dataSourceNames: dataSourceNames.map((source) => source.name),
            downloadService: platformDependentServices.fileDownloadService,
        })
);

export const getAnnotationService = createSelector(
    [getSelectedDataSources, getSelectedSourceMetadata, getPlatformDependentServices, getRefreshKey],
    (dataSources, metadataSource, platformDependentServices): AnnotationService =>
        new DatabaseAnnotationService({
            databaseService: platformDependentServices.databaseService,
            dataSourceNames: dataSources.map((source) => source.name),
            metadataSource,
        })
);

export const getGraph = createSelector(
    [getFileService, getEdgeDefinitions],
    (fileService, edgeDefinitions) => new Graph(fileService, edgeDefinitions)
);

export const getContextMenuKey = createSelector([getContextMenuPositionReference], (target) => {
    if (target instanceof Event) {
        return target.timeStamp;
    }
    return JSON.stringify(target);
});
