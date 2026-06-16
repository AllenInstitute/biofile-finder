import { groupBy, map } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import SearchParams, { SearchParamsComponents, FileView } from "../../entity/SearchParams";
import FileFilter, { FilterType } from "../../entity/FileFilter";
import { getAnnotations, getAnnotationNameToAnnotationMap } from "../metadata/selectors";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAvailableAnnotationsForHierarchy = (state: State) =>
    state.selection.availableAnnotationsForHierarchy;
export const getAvailableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.availableAnnotationsForHierarchyLoading;
export const getColumns = (state: State) => state.selection.columns;
export const getFileFilters = (state: State) => state.selection.filters;
export const getFileSelection = (state: State) => state.selection.fileSelection;
export const getFileView = (state: State) => state.selection.fileView;
export const getIsLoadingSource = (state: State) => state.selection.isLoadingDataSource;
export const getLastTouchedFolder = (state: State) => state.selection.lastTouchedFolder;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getRecentAnnotations = (state: State) => state.selection.recentAnnotations;
export const getRequiresDataSourceReload = (state: State) =>
    state.selection.requiresDataSourceReload;
export const getSelectedDataSources = (state: State) => state.selection.dataSources;
export const getSelectedSourceMetadata = (state: State) => state.selection.sourceMetadata;
export const getSelectedSourceProvenance = (state: State) => state.selection.sourceProvenance;
export const getProvenanceOriginId = (state: State) => state.selection.provenanceOriginId;
export const getSelectedQuery = (state: State) => state.selection.selectedQuery;
export const getShouldDisplaySmallFont = (state: State) => state.selection.shouldDisplaySmallFont;
export const getShouldShowNullGroups = (state: State) => state.selection.shouldShowNullGroups;
export const getSortColumn = (state: State) => state.selection.sortColumn;
export const getTutorials = (state: State) => state.selection.tutorials;
export const getQueries = (state: State) => state.selection.queries;
const getPlatformDependentServices = (state: State) => state.interaction.platformDependentServices; // Importing normally creates a circular dependency

// COMPOSED SELECTORS
export const hasQuerySelected = createSelector([getSelectedQuery], (query): boolean => !!query);

export const hasProvenanceSource = createSelector(
    [getSelectedSourceProvenance],
    (source): boolean => !!source
);

export const getTotalColumnWidth = createSelector([getColumns], (columns): number =>
    columns.reduce((acc, column) => acc + column.width, 0)
);

export const isQueryingAicsFms = createSelector(
    [getSelectedDataSources],
    (dataSources): boolean => dataSources[0]?.name === AICS_FMS_DATA_SOURCE_NAME
);

const FILE_VIEW_TO_COL_COUNT = {
    [FileView.LIST]: 1,
    [FileView.SMALL_THUMBNAIL]: 10,
    [FileView.LARGE_THUMBNAIL]: 5,
};
export const getFileGridColCount = createSelector(
    [getFileView],
    (fileView): number => FILE_VIEW_TO_COL_COUNT[fileView]
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

export const getColumnNames = createSelector([getColumns], (columns): string[] =>
    columns.map((column) => column.name)
);

export const getCurrentQueryParts = createSelector(
    [
        getAnnotationHierarchy,
        getColumns,
        getFileFilters,
        getFileView,
        getOpenFileFolders,
        getShouldShowNullGroups,
        getSortColumn,
        getSelectedDataSources,
        getSelectedSourceMetadata,
        getSelectedSourceProvenance,
        getProvenanceOriginId,
    ],
    (
        hierarchy,
        columns,
        filters,
        fileView,
        openFolders,
        showNoValueGroups,
        sortColumn,
        sources,
        sourceMetadata,
        provenanceSource,
        provOriginId
    ): SearchParamsComponents => ({
        columns,
        hierarchy,
        fileView,
        filters,
        openFolders,
        showNoValueGroups,
        sortColumn,
        sources,
        sourceMetadata,
        provenanceSource,
        provOriginId,
    })
);

export const getEncodedSearchParams = createSelector([getCurrentQueryParts], (queryParts): string =>
    SearchParams.encode(queryParts)
);

export const getLoadingNewQuery = createSelector([getQueries], (queries): boolean =>
    queries.some((q) => q.loading)
);

export const getLoadingQueryOrSource = createSelector(
    [getLoadingNewQuery, getIsLoadingSource],
    (loadingQueries, loadingSources): boolean => {
        return loadingQueries || loadingSources;
    }
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
        return SearchParams.convertToPython(
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
    [getFileFilters, getAnnotationNameToAnnotationMap],
    (globalFilters: FileFilter[], nameToAnnotationMap: Map<string, Annotation>) => {
        const filters = map(globalFilters, (filter: FileFilter) => ({
            name: filter.name,
            value: filter.value,
            displayValue:
                filter.type === FilterType.ANY || filter.type === FilterType.EXCLUDE
                    ? ""
                    : nameToAnnotationMap.get(filter.name)?.getDisplayValue(filter.value),
            type: filter?.type || FilterType.DEFAULT,
        })).filter((filter) => filter.displayValue !== undefined);
        return groupBy(filters, (filter) => filter.name);
    }
);

export const getUnavailableAnnotationsForHierarchy = createSelector(
    [getAnnotations, getAvailableAnnotationsForHierarchy],
    (allAnnotations, availableAnnotations) =>
        Annotation.sort(
            allAnnotations.filter((annotation) => !availableAnnotations.includes(annotation.name))
        )
);
