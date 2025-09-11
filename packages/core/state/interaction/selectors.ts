import { uniqBy } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import { ModalType } from "../../components/Modal";
import {
    AICS_FMS_DATA_SOURCE_NAME,
    DatasetBucketUrl,
    FESBaseUrl,
    MMSBaseUrl,
    LoadBalancerBaseUrl,
    CellFeatureExplorerBaseUrl,
    TemporaryFileServiceBaseUrl,
} from "../../constants";
import { getDatasetManifestSource, getDataSources } from "../metadata/selectors";
import { getSelectedDataSources, getPythonConversion } from "../selection/selectors";
import { AnnotationService, FileService } from "../../services";
import DatasetService, {
    DataSource,
    PythonicDataAccessSnippet,
} from "../../services/DataSourceService";
import DatabaseAnnotationService from "../../services/AnnotationService/DatabaseAnnotationService";
import DatabaseFileService from "../../services/FileService/DatabaseFileService";
import HttpAnnotationService from "../../services/AnnotationService/HttpAnnotationService";
import HttpFileService from "../../services/FileService/HttpFileService";

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
export const getSelectedPublicDataset = (state: State) => state.interaction.selectedPublicDataset;
export const getFileFiltersForVisibleModal = (state: State) =>
    state.interaction.fileFiltersForVisibleModal;
export const getFileTypeForVisibleModal = (state: State) =>
    state.interaction.fileTypeForVisibleModal;
export const getHasDismissedSmallScreenWarning = (state: State) =>
    state.interaction.hasDismissedSmallScreenWarning;
export const getHasUnsavedChanges = (state: State) => state.interaction.hasUnsavedChanges;
export const hasUsedApplicationBefore = (state: State) =>
    state.interaction.hasUsedApplicationBefore;
export const isOnWeb = (state: State) => state.interaction.isOnWeb;
export const getPlatformDependentServices = (state: State) =>
    state.interaction.platformDependentServices;
export const getProcessStatuses = (state: State) => state.interaction.status;
export const getProcessedFilesPythonSnippetFromState = (state: State) =>
    state.interaction.processFilesPythonSnippet;
export const getRefreshKey = (state: State) => state.interaction.refreshKey;
export const getUserSelectedApplications = (state: State) =>
    state.interaction.userSelectedApplications;
export const getVisibleModal = (state: State) => state.interaction.visibleModal;
export const isAicsEmployee = (state: State) => state.interaction.isAicsEmployee;

// URL Mapping Selectors
export const getFileExplorerServiceBaseUrl = createSelector(
    [getEnvironment],
    (environment) => FESBaseUrl[environment]
);

export const getDatasetBucketUrl = createSelector(
    [getEnvironment],
    (environment) => DatasetBucketUrl[environment]
);

export const getLoadBalancerBaseUrl = createSelector(
    [getEnvironment],
    (environment) => LoadBalancerBaseUrl[environment]
);

export const getMetadataManagementServiceBaseUrl = createSelector(
    [getEnvironment],
    (environment) => MMSBaseUrl[environment]
);

export const getCellFeatureExplorerBaseUrl = createSelector(
    [getEnvironment],
    (environment) => CellFeatureExplorerBaseUrl[environment]
);

export const getTemporaryFileServiceBaseUrl = createSelector(
    [getEnvironment],
    (environment) => TemporaryFileServiceBaseUrl[environment]
);

// COMPOSED SELECTORS
export const getApplicationVersion = createSelector(
    [getPlatformDependentServices],
    ({ applicationInfoService }): string => applicationInfoService.getApplicationVersion()
);

export const getIsDisplayingSmallScreenWarning = createSelector(
    [getVisibleModal],
    (visibleModal): boolean => visibleModal === ModalType.SmallScreenWarning
);

export const getAllDataSources = createSelector(
    [getDataSources, isAicsEmployee],
    (dataSources, isAicsEmployee): DataSource[] =>
        isAicsEmployee
            ? uniqBy(
                  [
                      ...dataSources,
                      {
                          id: AICS_FMS_DATA_SOURCE_NAME,
                          name: AICS_FMS_DATA_SOURCE_NAME,
                          type: "csv",
                          version: 1,
                      },
                  ],
                  "id"
              )
            : dataSources
);

export const getProcessFilesPythonSnippet = (state: State) =>
    state.interaction.processFilesPythonSnippet;

export const getPythonSnippet = createSelector(
    [getPythonConversion],
    (pythonQuery): PythonicDataAccessSnippet => {
        const setup = `pip install \"pandas>=1.5\"`;
        const code = `${pythonQuery}`;

        return { setup, code };
    }
);

export const getUserName = createSelector(
    [getPlatformDependentServices],
    (platformDependentServices) => {
        if (!platformDependentServices || !platformDependentServices.applicationInfoService) {
            return undefined;
        }
        return platformDependentServices.applicationInfoService.getUserName();
    }
);

export const getHttpFileService = createSelector(
    [
        getApplicationVersion,
        getFileExplorerServiceBaseUrl,
        getLoadBalancerBaseUrl,
        getMetadataManagementServiceBaseUrl,
        getUserName,
        getPlatformDependentServices,
        getRefreshKey,
    ],
    (
        applicationVersion,
        fileExplorerServiceBaseUrl,
        loadBalancerBaseUrl,
        metadataManagementServiceBaseURL,
        userName,
        platformDependentServices
    ) =>
        new HttpFileService({
            userName,
            applicationVersion,
            fileExplorerServiceBaseUrl,
            loadBalancerBaseUrl,
            metadataManagementServiceBaseURl: metadataManagementServiceBaseURL,
            downloadService: platformDependentServices.fileDownloadService,
        })
);

export const getFileService = createSelector(
    [getHttpFileService, getSelectedDataSources, getPlatformDependentServices, getRefreshKey],
    (httpFileService, dataSourceNames, platformDependentServices): FileService => {
        if (dataSourceNames[0]?.name !== AICS_FMS_DATA_SOURCE_NAME) {
            return new DatabaseFileService({
                databaseService: platformDependentServices.databaseService,
                dataSourceNames: dataSourceNames.map((source) => source.name),
                downloadService: platformDependentServices.fileDownloadService,
            });
        }

        return httpFileService;
    }
);

/**
 * Selector specifically for open-source dataset manifest, re-using regular file service interface.
 * Unlike getFileService, returns undefined if no dataset manifest is present
 * Used in web only
 */
export const getPublicDatasetManifestService = createSelector(
    [getDatasetManifestSource, getPlatformDependentServices],
    (datasetManifestSource, platformDependentServices): FileService | undefined => {
        if (!datasetManifestSource || !platformDependentServices) {
            return undefined;
        }
        return new DatabaseFileService({
            databaseService: platformDependentServices.databaseService,
            dataSourceNames: [datasetManifestSource.name],
            downloadService: platformDependentServices.fileDownloadService,
        });
    }
);

export const getAnnotationService = createSelector(
    [
        getApplicationVersion,
        getUserName,
        getFileExplorerServiceBaseUrl,
        getMetadataManagementServiceBaseUrl,
        getSelectedDataSources,
        getPlatformDependentServices,
        getRefreshKey,
    ],
    (
        applicationVersion,
        userName,
        fileExplorerServiceBaseUrl,
        metadataManagementServiceBaseUrl,
        dataSources,
        platformDependentServices
    ): AnnotationService => {
        if (dataSources.length && dataSources[0]?.name !== AICS_FMS_DATA_SOURCE_NAME) {
            return new DatabaseAnnotationService({
                databaseService: platformDependentServices.databaseService,
                dataSourceNames: dataSources.map((source) => source.name),
            });
        }
        return new HttpAnnotationService({
            applicationVersion,
            userName,
            fileExplorerServiceBaseUrl,
            metadataManagementServiceBaseURl: metadataManagementServiceBaseUrl,
        });
    }
);

export const getDatasetService = createSelector(
    [getApplicationVersion, getUserName, getFileExplorerServiceBaseUrl, getRefreshKey],
    (applicationVersion, userName, fileExplorerServiceBaseUrl) =>
        new DatasetService({
            applicationVersion,
            userName,
            fileExplorerServiceBaseUrl,
        })
);

/**
 * In order to make certain a new ContextMenu is rendered on each contextmenu event (e.g., a right-click),
 * we pass a new `key` (as in, a React key) to the component so that React knows to replace, not update,
 * the ContextMenu component. This application _should_ generally store MouseEvents in `contextMenuPositionReference`,
 * in which case treat the event's timestamp as the key. For completeness, if the value is not an event,
 * JSON.stringify it so that it can be treated as a React key no matter its type.
 */
export const getContextMenuKey = createSelector([getContextMenuPositionReference], (target) => {
    if (target instanceof Event) {
        return target.timeStamp;
    }

    return JSON.stringify(target);
});
