import { uniqBy } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import { getDataSource, getPythonConversion } from "../selection/selectors";
import { AnnotationService, FileService } from "../../services";
import DatasetService, {
    DataSource,
    PythonicDataAccessSnippet,
} from "../../services/DataSourceService";
import DatabaseAnnotationService from "../../services/AnnotationService/DatabaseAnnotationService";
import DatabaseFileService from "../../services/FileService/DatabaseFileService";
import HttpAnnotationService from "../../services/AnnotationService/HttpAnnotationService";
import HttpFileService from "../../services/FileService/HttpFileService";
import { getDataSources } from "../metadata/selectors";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";

// BASIC SELECTORS
export const getContextMenuVisibility = (state: State) => state.interaction.contextMenuIsVisible;
export const getContextMenuItems = (state: State) => state.interaction.contextMenuItems;
export const getContextMenuPositionReference = (state: State) =>
    state.interaction.contextMenuPositionReference;
export const getContextMenuOnDismiss = (state: State) => state.interaction.contextMenuOnDismiss;
export const getCsvColumns = (state: State) => state.interaction.csvColumns;
export const getDataSourceForVisibleModal = (state: State) =>
    state.interaction.dataSourceForVisibleModal;
export const getFileExplorerServiceBaseUrl = (state: State) =>
    state.interaction.fileExplorerServiceBaseUrl;
export const getFileFiltersForVisibleModal = (state: State) =>
    state.interaction.fileFiltersForVisibleModal;
export const getFileTypeForVisibleModal = (state: State) =>
    state.interaction.fileTypeForVisibleModal;
export const hasUsedApplicationBefore = (state: State) =>
    state.interaction.hasUsedApplicationBefore;
export const isOnWeb = (state: State) => state.interaction.isOnWeb;
export const getPlatformDependentServices = (state: State) =>
    state.interaction.platformDependentServices;
export const getProcessStatuses = (state: State) => state.interaction.status;
export const getRefreshKey = (state: State) => state.interaction.refreshKey;
export const getUserSelectedApplications = (state: State) =>
    state.interaction.userSelectedApplications;
export const getVisibleModal = (state: State) => state.interaction.visibleModal;
export const isAicsEmployee = (state: State) => state.interaction.isAicsEmployee;

// COMPOSED SELECTORS
export const getApplicationVersion = createSelector(
    [getPlatformDependentServices],
    ({ applicationInfoService }): string => applicationInfoService.getApplicationVersion()
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
        getUserName,
        getFileExplorerServiceBaseUrl,
        getPlatformDependentServices,
        getRefreshKey,
    ],
    (applicationVersion, userName, fileExplorerBaseUrl, platformDependentServices) =>
        new HttpFileService({
            applicationVersion,
            userName,
            baseUrl: fileExplorerBaseUrl,
            downloadService: platformDependentServices.fileDownloadService,
        })
);

export const getFileService = createSelector(
    [getHttpFileService, getDataSource, getPlatformDependentServices, getRefreshKey],
    (httpFileService, dataSource, platformDependentServices): FileService => {
        if (dataSource && dataSource?.name !== AICS_FMS_DATA_SOURCE_NAME) {
            return new DatabaseFileService({
                databaseService: platformDependentServices.databaseService,
                dataSourceName: dataSource.name,
                downloadService: platformDependentServices.fileDownloadService,
            });
        }

        return httpFileService;
    }
);

export const getAnnotationService = createSelector(
    [
        getApplicationVersion,
        getUserName,
        getFileExplorerServiceBaseUrl,
        getDataSource,
        getPlatformDependentServices,
        getRefreshKey,
    ],
    (
        applicationVersion,
        userName,
        fileExplorerBaseUrl,
        dataSource,
        platformDependentServices
    ): AnnotationService => {
        if (dataSource && dataSource?.name !== AICS_FMS_DATA_SOURCE_NAME) {
            return new DatabaseAnnotationService({
                databaseService: platformDependentServices.databaseService,
                dataSourceName: dataSource.name,
            });
        }
        return new HttpAnnotationService({
            applicationVersion,
            userName,
            baseUrl: fileExplorerBaseUrl,
        });
    }
);

export const getDatasetService = createSelector(
    [getApplicationVersion, getUserName, getFileExplorerServiceBaseUrl, getRefreshKey],
    (applicationVersion, userName, fileExplorerBaseUrl) =>
        new DatasetService({
            applicationVersion,
            userName,
            baseUrl: fileExplorerBaseUrl,
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
