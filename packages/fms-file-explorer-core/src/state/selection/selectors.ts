import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getAvailableAnnotationsForHierarchy = (state: State) =>
    state.selection.availableAnnotationsForHierarchy;
export const getAvailableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.availableAnnotationsForHierarchyLoading;
export const getColumnWidths = (state: State) => state.selection.columnWidths;
export const getFileFilters = (state: State) => state.selection.filters;
export const getFileSelection = (state: State) => state.selection.fileSelection;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getRefreshKey = (state: State) => state.selection.refreshKey;

// COMPOSED SELECTORS
export const getOrderedDisplayAnnotations = createSelector(
    getAnnotationsToDisplay,
    (annotations: Annotation[]) => {
        return Annotation.sort(annotations);
    }
);

export const getEncodedFileExplorerUrl = createSelector(
    [getAnnotationHierarchy, getFileFilters, getOpenFileFolders],
    (hierarchy: Annotation[], filters: FileFilter[], openFolders: FileFolder[]) => {
        return FileExplorerURL.encode({ hierarchy, filters, openFolders });
    }
);
