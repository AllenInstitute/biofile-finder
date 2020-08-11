import { createSelector } from "reselect";

import { State } from "../";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;

// COMPOSED SELECTORS
export const getSortedAnnotations = createSelector([getAnnotations], (allAnnotations) =>
    allAnnotations.sort((a, b) => a.displayName.localeCompare(b.displayName))
);
