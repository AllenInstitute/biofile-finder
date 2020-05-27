import { first } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getFileFilters = (state: State) => state.selection.filters;
export const getSelectedFilesByFileSet = (state: State) => state.selection.selectedFilesByFileSet;

// COMPOSED SELECTORS
export const getFirstSelectedFile = createSelector(
    [getSelectedFilesByFileSet],
    (selectedFilesByFileSet) => {
        const anyFileSet = Object.keys(selectedFilesByFileSet)[0];
        return first(anyFileSet);
    }
);
