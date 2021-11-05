import { createSelector } from "reselect";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import Annotation from "../../entity/Annotation";

import * as interactionSelectors from "../../state/interaction/selectors";
import * as metadataSelectors from "../../state/metadata/selectors";
import * as selectionSelectors from "../../state/selection/selectors";

/**
 * Returns Annotation instances for those annotations that were previously used to generate
 * either a CSV manifest or dataset (via Python snippet generation).
 */
export const getAnnotationsPreviouslySelected = createSelector(
    [
        interactionSelectors.getCsvColumns,
        metadataSelectors.getCustomAnnotationsCombinedWithFileAttributes,
    ],
    (annotationDisplayNames, annotations) => {
        return annotations.filter((annotation) =>
            annotationDisplayNames?.includes(annotation.displayName)
        );
    }
);

export const getSelectedCollectionAnnotations = createSelector(
    [selectionSelectors.getCollection, metadataSelectors.getAnnotations],
    (collection, annotations): Annotation[] =>
        collection?.annotations?.reduce((accum, collectionAnnotation) => {
            const annotation = [...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations].find(
                (annotation) => annotation.name === collectionAnnotation
            );
            // Ideally should never occur if annotation options are aligned with annotations
            // available in the collection
            if (!annotation) {
                console.error(`Unable to find match for annotation ${collectionAnnotation}`);
                return accum;
            }
            return [...accum, annotation];
        }, [] as Annotation[]) || []
);
