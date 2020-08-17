import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getAvailableAnnotationsForHierarchy = (state: State) =>
    state.selection.availableAnnotationsForHierarchy;
export const getAvailableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.availableAnnotationsForHierarchyLoading;
export const getColumnWidths = (state: State) => state.selection.columnWidths;
export const getFileFilters = (state: State) => state.selection.filters;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getSelectedFileRangesByFileSet = (state: State) =>
    state.selection.selectedFileRangesByFileSet;

// COMPOSED SELECTORS
export const getOrderedDisplayAnnotations = createSelector(
    getAnnotationsToDisplay,
    (annotations: Annotation[]) => {
        return Annotation.sort(annotations);
    }
);
