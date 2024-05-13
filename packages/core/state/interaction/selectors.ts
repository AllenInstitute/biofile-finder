import { createSelector } from "reselect";

import { State } from "../";
import { getCollection, getPythonConversion } from "../selection/selectors";
import { AnnotationService, FileService, HttpServiceBase } from "../../services";
import DatasetService, { PythonicDataAccessSnippet } from "../../services/DatasetService";
import DatabaseAnnotationService from "../../services/AnnotationService/DatabaseAnnotationService";
import DatabaseFileService from "../../services/FileService/DatabaseFileService";
import HttpAnnotationService from "../../services/AnnotationService/HttpAnnotationService";
import HttpFileService from "../../services/FileService/HttpFileService";

// BASIC SELECTORS
export const getApplicationVersion = (state: State) => state.interaction.applicationVersion;
export const getContextMenuVisibility = (state: State) => state.interaction.contextMenuIsVisible;
export const getContextMenuItems = (state: State) => state.interaction.contextMenuItems;
export const getContextMenuPositionReference = (state: State) =>
    state.interaction.contextMenuPositionReference;
export const getContextMenuOnDismiss = (state: State) => state.interaction.contextMenuOnDismiss;
export const getCsvColumns = (state: State) => state.interaction.csvColumns;
export const getFileExplorerServiceBaseUrl = (state: State) =>
    state.interaction.fileExplorerServiceBaseUrl;
export const getFileFiltersForVisibleModal = (state: State) =>
    state.interaction.fileFiltersForVisibleModal;
export const hasUsedApplicationBefore = (state: State) =>
    state.interaction.hasUsedApplicationBefore;
export const getPlatformDependentServices = (state: State) =>
    state.interaction.platformDependentServices;
export const getProcessStatuses = (state: State) => state.interaction.status;
export const getRefreshKey = (state: State) => state.interaction.refreshKey;
export const getUserSelectedApplications = (state: State) =>
    state.interaction.userSelectedApplications;
export const getVisibleModal = (state: State) => state.interaction.visibleModal;

// COMPOSED SELECTORS
export const getPythonSnippet = createSelector(
    [getPythonConversion],
    (pythonQuery): PythonicDataAccessSnippet => {
        const setup = "pip install pandas";
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

export const getFileService = createSelector(
    [
        getApplicationVersion,
        getUserName,
        getFileExplorerServiceBaseUrl,
        getCollection,
        getPlatformDependentServices,
        getRefreshKey,
    ],
    (
        applicationVersion,
        userName,
        fileExplorerBaseUrl,
        collection,
        platformDependentServices
    ): FileService => {
        if (collection?.uri) {
            return new DatabaseFileService({
                databaseService: platformDependentServices.databaseService,
            });
        }
        const pathSuffix = collection
            ? `/within/${HttpServiceBase.encodeURI(collection.name)}/${collection.version}`
            : undefined;
        return new HttpFileService({
            applicationVersion,
            userName,
            baseUrl: fileExplorerBaseUrl,
            pathSuffix,
        });
    }
);

export const getAnnotationService = createSelector(
    [
        getApplicationVersion,
        getUserName,
        getFileExplorerServiceBaseUrl,
        getCollection,
        getPlatformDependentServices,
        getRefreshKey,
    ],
    (
        applicationVersion,
        userName,
        fileExplorerBaseUrl,
        collection,
        platformDependentServices
    ): AnnotationService => {
        if (collection?.uri) {
            return new DatabaseAnnotationService({
                databaseService: platformDependentServices.databaseService,
            });
        }
        const pathSuffix = collection
            ? `/within/${HttpServiceBase.encodeURI(collection.name)}/${collection.version}`
            : undefined;
        return new HttpAnnotationService({
            applicationVersion,
            userName,
            baseUrl: fileExplorerBaseUrl,
            pathSuffix,
        });
    }
);

export const getDatasetService = createSelector(
    [
        getApplicationVersion,
        getUserName,
        getFileExplorerServiceBaseUrl,
        getPlatformDependentServices,
        getRefreshKey,
    ],
    (applicationVersion, userName, fileExplorerBaseUrl, platformDependentServices) => {
        const { databaseService } = platformDependentServices;
        return new DatasetService({
            applicationVersion,
            userName,
            baseUrl: fileExplorerBaseUrl,
            database: databaseService,
        });
    }
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
