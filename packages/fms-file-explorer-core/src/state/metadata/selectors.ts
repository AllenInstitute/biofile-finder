import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;

// COMPOSED SELECTORS
export const getSortedAnnotations = createSelector(getAnnotations, (annotations: Annotation[]) =>
    Annotation.sort(annotations)
);
