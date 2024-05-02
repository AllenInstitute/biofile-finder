import { groupBy, keyBy, map } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import Annotation, { AnnotationName } from "../../entity/Annotation";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
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
export const getCollection = (state: State) => state.selection.collection;
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
export const getEncodedFileExplorerUrl = createSelector(
    [getAnnotationHierarchy, getFileFilters, getOpenFileFolders, getSortColumn, getCollection],
    (
        hierarchy: string[],
        filters: FileFilter[],
        openFolders: FileFolder[],
        sortColumn?: FileSort,
        collection?: Dataset
    ) => {
        return FileExplorerURL.encode({
            hierarchy,
            filters,
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

// COMPOSED SELECTORS
export const getSortedAnnotations = createSelector(
    [getAnnotations, getRecentAnnotations],
    (annotations: Annotation[], recentAnnotationNames: string[]) => {
        // Create Array of annotations from recentAnnotationNames
        const recentAnnotations = annotations.filter((annotation) =>
            recentAnnotationNames.includes(annotation.name)
        );

        // get the File name annotaion in a list (if Present)
        const fileNameAnnotation = annotations.filter(
            (annotation) =>
                annotation.name === AnnotationName.FILE_NAME || annotation.name === "File Name"
        );

        // combine all annotation lists
        const combinedAnnotations = fileNameAnnotation.concat(
            recentAnnotations,
            ...Annotation.sort(annotations)
        );

        // create map for filtering duplicate annotations.
        const combinedAnnotationsMap = new Map();

        // Iterate through the combined list and store annotations by their name in the Map.
        combinedAnnotations.forEach((annotation) => {
            combinedAnnotationsMap.set(annotation.name, annotation);
        });

        // Convert the Map values (unique annotations) back to an array.
        return Array.from(combinedAnnotationsMap.values());
    }
);
