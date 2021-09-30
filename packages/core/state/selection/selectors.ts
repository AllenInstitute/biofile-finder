import { createSelector } from "reselect";

import { metadata, State } from "../";
import { TOP_LEVEL_FILE_ANNOTATIONS, TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import Annotation from "../../entity/Annotation";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSort from "../../entity/FileSort";
import { Dataset } from "../../services/DatasetService";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getAvailableAnnotationsForHierarchy = (state: State) =>
    state.selection.availableAnnotationsForHierarchy;
export const getAvailableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.availableAnnotationsForHierarchyLoading;
export const getColumnWidths = (state: State) => state.selection.columnWidths;
export const getFileFilters = (state: State) => state.selection.filters;
export const getCollectionId = (state: State) => state.selection.collectionId;
export const getFileSelection = (state: State) => state.selection.fileSelection;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getSortColumn = (state: State) => state.selection.sortColumn;

// COMPOSED SELECTORS
export const getOrderedDisplayAnnotations = createSelector(
    getAnnotationsToDisplay,
    (annotations: Annotation[]) => {
        return Annotation.sort(annotations);
    }
);

export const getSelectedCollection = createSelector(
    [getCollectionId, metadata.selectors.getActiveCollections],
    (collectionId, collections): Dataset | undefined =>
        collections.find((collection) => collection.id === collectionId)
);

export const getSelectedCollectionAnnotations = createSelector(
    [getSelectedCollection, metadata.selectors.getAnnotations],
    (collection, annotations): Annotation[] | undefined =>
        collection?.annotations?.flatMap((collectionAnnotation) => {
            const annotation = [...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations].find(
                (annotation) => annotation.name === collectionAnnotation
            );
            // Ideally should never occur if annotation options are aligned with annotations
            // available in the collection
            if (!annotation) {
                console.error(`Unable to find match for annotation ${collectionAnnotation}`);
                return [];
            }
            return [annotation];
        })
);

export const getEncodedFileExplorerUrl = createSelector(
    [
        getAnnotationHierarchy,
        getFileFilters,
        getOpenFileFolders,
        getSortColumn,
        getSelectedCollection,
    ],
    (
        hierarchy: Annotation[],
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

export const getAnnotationFilters = createSelector([getFileFilters], (fileFilters): FileFilter[] =>
    fileFilters.filter((f) => !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(f.name))
);

export const getFileAttributeFilter = createSelector([getFileFilters], (fileFilters):
    | FileFilter
    | undefined => fileFilters.find((f) => TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(f.name)));
