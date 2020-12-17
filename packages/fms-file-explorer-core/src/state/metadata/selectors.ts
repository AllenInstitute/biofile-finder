import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;

// COMPOSED SELECTORS
export const getSortedAnnotations = createSelector(getAnnotations, (annotations: Annotation[]) =>
    Annotation.sort(annotations)
);

export const getCustomAnnotationsCombinedWithFileAttributes = createSelector(
    getSortedAnnotations,
    (annotations) => Annotation.sort([...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations])
);
