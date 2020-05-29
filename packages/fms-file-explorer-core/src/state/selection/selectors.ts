import { State } from "../";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getFileFilters = (state: State) => state.selection.filters;
export const getSelectedFileIndicesByFileSet = (state: State) =>
    state.selection.selectedFileIndicesByFileSet;
