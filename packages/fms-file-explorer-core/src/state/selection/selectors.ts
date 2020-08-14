import { sortBy } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
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
        // start by putting in alpha order
        const collator = new Intl.Collator("en");
        const sortedByDisplayName = [...annotations].sort((a, b) =>
            collator.compare(a.displayName, b.displayName)
        );

        // put an annotation from "TOP_LEVEL_ANNOTATIONS" ahead of the others
        return sortBy(sortedByDisplayName, (annotation) => {
            const indexWithinTOP_LEVEL_ANNOTATIONS = TOP_LEVEL_FILE_ANNOTATIONS.indexOf(annotation);
            if (indexWithinTOP_LEVEL_ANNOTATIONS > -1) {
                return indexWithinTOP_LEVEL_ANNOTATIONS;
            }

            return Number.POSITIVE_INFINITY;
        });
    }
);
