import { State } from "../";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getCombinableAnnotationsForHierarchy = (state: State) =>
    state.selection.combinableAnnotationsForHierarchy;
export const getCombinableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.combinableAnnotationsForHierarchyLoading;
export const getFileFilters = (state: State) => state.selection.filters;
export const getSelectedFileIndicesByFileSet = (state: State) =>
    state.selection.selectedFileIndicesByFileSet;
