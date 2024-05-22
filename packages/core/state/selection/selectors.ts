import { groupBy, keyBy, map } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import FileExplorerURL, { FileExplorerURLComponents } from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSort from "../../entity/FileSort";
import { DataSource } from "../../services/DataSourceService";
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
export const getDataSource = (state: State) => state.selection.dataSource;
export const getFileGridColumnCount = (state: State) => state.selection.fileGridColumnCount;
export const getFileFilters = (state: State) => state.selection.filters;
export const getFileSelection = (state: State) => state.selection.fileSelection;
export const getIsDarkTheme = (state: State) => state.selection.isDarkTheme;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getRecentAnnotations = (state: State) => state.selection.recentAnnotations;
export const getSelectedQuery = (state: State) => state.selection.selectedQuery;
export const getShouldDisplaySmallFont = (state: State) => state.selection.shouldDisplaySmallFont;
export const getShouldDisplayThumbnailView = (state: State) =>
    state.selection.shouldDisplayThumbnailView;
export const getSortColumn = (state: State) => state.selection.sortColumn;
export const getTutorial = (state: State) => state.selection.tutorial;
export const getQueries = (state: State) => state.selection.queries;

// COMPOSED SELECTORS
export const isQueryingAicsFms = createSelector(
    [getDataSource],
    (dataSource): boolean => !dataSource || dataSource.name === AICS_FMS_DATA_SOURCE_NAME
);

export const getCurrentQueryParts = createSelector(
    [getAnnotationHierarchy, getFileFilters, getOpenFileFolders, getSortColumn, getDataSource],
    (
        hierarchy: string[],
        filters: FileFilter[],
        openFolders: FileFolder[],
        sortColumn?: FileSort,
        source?: DataSource
    ): FileExplorerURLComponents => ({
        hierarchy,
        filters,
        openFolders,
        sortColumn,
        source,
    })
);

export const getEncodedFileExplorerUrl = createSelector(
    [getCurrentQueryParts],
    (queryParts): string => FileExplorerURL.encode(queryParts)
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
