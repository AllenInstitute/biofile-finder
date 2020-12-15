import { createSelector } from "reselect";

import { interaction, metadata } from "../../state";

export const getAnnotationsPreviouslySelected = createSelector(
    [interaction.selectors.getCsvColumns, metadata.selectors.getSortedAnnotations],
    (annotationDisplayNames, annotations) => {
        return annotations.filter((annotation) =>
            annotationDisplayNames?.includes(annotation.name)
        );
    }
);
