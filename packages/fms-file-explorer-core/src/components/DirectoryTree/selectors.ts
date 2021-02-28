import { createSelector } from "reselect";

import { selection } from "../../state";

export const getHierarchy = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotationHierarchy) => {
        return annotationHierarchy.map((annotation) => annotation.name);
    }
);
