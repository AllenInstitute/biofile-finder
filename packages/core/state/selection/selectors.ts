import { groupBy, keyBy, map } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import FileExplorerURL, { FileExplorerURLComponents } from "../../entity/FileExplorerURL";
import FileFilter, { FilterType } from "../../entity/FileFilter";
import { getAnnotations } from "../metadata/selectors";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getAvailableAnnotationsForHierarchy = (state: State) =>
    state.selection.availableAnnotationsForHierarchy;
export const getAvailableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.availableAnnotationsForHierarchyLoading;
export const getColumnWidths = (state: State) => state.selection.columnWidths;
export const getFileGridColumnCount = (state: State) => state.selection.fileGridColumnCount;
export const getFileFilters = (state: State) => state.selection.filters;
export const getFileSelection = (state: State) => state.selection.fileSelection;
export const getIsDarkTheme = (state: State) => state.selection.isDarkTheme;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getRecentAnnotations = (state: State) => state.selection.recentAnnotations;
export const getSelectedDataSources = (state: State) => state.selection.dataSources;
export const getSelectedSourceMetadata = (state: State) => state.selection.sourceMetadata;
export const getSelectedQuery = (state: State) => state.selection.selectedQuery;
export const getShouldDisplaySmallFont = (state: State) => state.selection.shouldDisplaySmallFont;
export const getShouldDisplayThumbnailView = (state: State) =>
    state.selection.shouldDisplayThumbnailView;
export const getSortColumn = (state: State) => state.selection.sortColumn;
export const getTutorial = (state: State) => state.selection.tutorial;
export const getQueries = (state: State) => state.selection.queries;
const getPlatformDependentServices = (state: State) => state.interaction.platformDependentServices; // Importing normally creates a circular dependency

// COMPOSED SELECTORS
export const hasQuerySelected = createSelector([getSelectedQuery], (query): boolean => !!query);

export const isQueryingAicsFms = createSelector(
    [getSelectedDataSources],
    (dataSources): boolean => dataSources[0]?.name === AICS_FMS_DATA_SOURCE_NAME
);

export const getFuzzyFilters = createSelector([getFileFilters], (filters): FileFilter[] =>
    filters.filter((filter) => filter.type === FilterType.FUZZY)
);

export const getAnnotationsFilteredOut = createSelector([getFileFilters], (filters): FileFilter[] =>
    filters.filter((filter) => filter.type === FilterType.EXCLUDE)
);

export const getAnnotationsRequired = createSelector([getFileFilters], (filters): FileFilter[] =>
    filters.filter((filter) => filter.type === FilterType.ANY)
);

export const getDefaultFileFilters = createSelector([getFileFilters], (filters): FileFilter[] =>
    filters.filter((filter) => filter.type === FilterType.DEFAULT)
);

export const getCurrentQueryParts = createSelector(
    [
        getAnnotationHierarchy,
        getFileFilters,
        getOpenFileFolders,
        getSortColumn,
        getSelectedDataSources,
        getSelectedSourceMetadata,
    ],
    (
        hierarchy,
        filters,
        openFolders,
        sortColumn,
        sources,
        sourceMetadata
    ): FileExplorerURLComponents => ({
        hierarchy,
        filters,
        openFolders,
        sortColumn,
        sources,
        sourceMetadata,
    })
);

export const getEncodedFileExplorerUrl = createSelector(
    [getCurrentQueryParts],
    (queryParts): string => FileExplorerURL.encode(queryParts)
);

export const getPythonConversion = createSelector(
    [
        getPlatformDependentServices,
        getAnnotationHierarchy,
        getFileFilters,
        getOpenFileFolders,
        getSortColumn,
        getSelectedDataSources,
    ],
    (platformDependentServices, hierarchy, filters, openFolders, sortColumn, sources) => {
        return FileExplorerURL.convertToPython(
            {
                hierarchy,
                filters,
                openFolders,
                sortColumn,
                sources,
            },
            platformDependentServices.executionEnvService.getOS()
        );
    }
);

export const getGroupedByFilterName = createSelector(
    [getFileFilters, getAnnotations],
    (globalFilters: FileFilter[], annotations: Annotation[]) => {
        const annotationNameToInstanceMap = keyBy(annotations, "name");
        const filters = map(globalFilters, (filter: FileFilter) => {
            const annotation = annotationNameToInstanceMap[filter.name];
            return {
                displayName: annotation?.displayName,
                name: filter.name,
                value: filter.value,
                displayValue: annotation?.getDisplayValue(filter.value),
                type: filter?.type || FilterType.DEFAULT,
            };
        }).filter((filter) => filter.displayValue !== undefined);
        return groupBy(filters, (filter) => filter.displayName);
    }
);

export const getUnavailableAnnotationsForHierarchy = createSelector(
    [getAnnotations, getAvailableAnnotationsForHierarchy],
    (allAnnotations, availableAnnotations) =>
        Annotation.sort(
            allAnnotations.filter((annotation) => !availableAnnotations.includes(annotation.name))
        )
);
