import { find } from "lodash";
import { createSelector } from "reselect";

import { State, metadata } from "../";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../metadata/reducer";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getAvailableAnnotationsForHierarchy = (state: State) =>
    state.selection.availableAnnotationsForHierarchy;
export const getAvailableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.availableAnnotationsForHierarchyLoading;
export const getFileFilters = (state: State) => state.selection.filters;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getSelectedFileRangesByFileSet = (state: State) =>
    state.selection.selectedFileRangesByFileSet;

// COMPOSED SELECTORS
export const getAnnotationsNotOnDisplay = createSelector(
    [getAnnotationsToDisplay, metadata.selectors.getAnnotations],
    (displayAnnotations, allAnnotations) => {
        // Sort the annotations so the non-file level annotations are in alphabetical
        const allAnnotationsSorted = allAnnotations.sort((a, b) =>
            a.displayName.localeCompare(b.displayName)
        );
        return [...TOP_LEVEL_FILE_ANNOTATIONS, ...allAnnotationsSorted].filter(
            (a) => !find(displayAnnotations, (ca) => ca.name === a.name)
        );
    }
);
