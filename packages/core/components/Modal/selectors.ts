import { createSelector } from "reselect";

import * as interactionSelectors from "../../state/interaction/selectors";
import * as metadataSelectors from "../../state/metadata/selectors";

/**
 * Returns Annotation instances for those annotations that were previously used to generate
 * either a CSV manifest or dataset (via Python snippet generation).
 */
export const getAnnotationsPreviouslySelected = createSelector(
    [interactionSelectors.getCsvColumns, metadataSelectors.getAnnotations],
    (annotationDisplayNames, annotations) => {
        return annotations.filter((annotation) =>
            annotationDisplayNames?.includes(annotation.displayName)
        );
    }
);
