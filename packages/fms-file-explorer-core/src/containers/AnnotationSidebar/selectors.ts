import { map } from "lodash";
import { createSelector } from "reselect";

import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getAnnotations],
    (annotations: Annotation[]) => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            description: annotation.description,
            title: annotation.displayName,
        }));
    }
);

export const getHierarchyListItems = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotations: Annotation[]) => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            description: annotation.description,
            title: annotation.displayName,
        }));
    }
);
