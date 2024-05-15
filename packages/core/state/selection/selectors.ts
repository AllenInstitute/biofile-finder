import { groupBy, keyBy, map } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFuzzyFilter from "../../entity/FileFuzzyFilter";
import FileFolder from "../../entity/FileFolder";
import FileSort from "../../entity/FileSort";
import { Dataset } from "../../services/DatasetService";
import { getAnnotations } from "../metadata/selectors";

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
export const getFileFuzzyFilters = (state: State) => state.selection.fuzzyFilters;
export const getCollection = (state: State) => state.selection.collection;
export const getFileSelection = (state: State) => state.selection.fileSelection;
export const getIsDarkTheme = (state: State) => state.selection.isDarkTheme;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getSelectedQuery = (state: State) => state.selection.selectedQuery;
export const getShouldDisplaySmallFont = (state: State) => state.selection.shouldDisplaySmallFont;
export const getShouldDisplayThumbnailView = (state: State) =>
    state.selection.shouldDisplayThumbnailView;
export const getSortColumn = (state: State) => state.selection.sortColumn;
export const getTutorial = (state: State) => state.selection.tutorial;
export const getQueries = (state: State) => state.selection.queries;

// COMPOSED SELECTORS
export const getEncodedFileExplorerUrl = createSelector(
    [
        getAnnotationHierarchy,
        getFileFilters,
        getOpenFileFolders,
        getFileFuzzyFilters,
        getSortColumn,
        getCollection,
    ],
    (
        hierarchy: string[],
        filters: FileFilter[],
        openFolders: FileFolder[],
        fuzzyFilters?: FileFuzzyFilter[],
        sortColumn?: FileSort,
        collection?: Dataset
    ) => {
        return FileExplorerURL.encode({
            hierarchy,
            filters,
            fuzzyFilters,
            openFolders,
            sortColumn,
            collection,
        });
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
