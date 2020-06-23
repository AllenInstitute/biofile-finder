import { State } from "../";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getFileFilters = (state: State) => state.selection.filters;
export const getSelectedFileIndicesByFileSet = (state: State) =>
    state.selection.selectedFileIndicesByFileSet;

// SPECIAL SELECTORS
// Select all files sets that are for the current data source
export const getActiveFileSets = (state: State) =>
    Object.keys(state.selection.selectedFileIndicesByFileSet).filter(
        (fileSet) =>
            fileSet
                .split(":")
                .slice(1)
                .join(":") === state.interaction.fileExplorerServiceBaseUrl
    );
