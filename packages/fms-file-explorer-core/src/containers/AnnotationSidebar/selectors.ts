import { map } from "lodash";
import { createSelector } from "reselect";

import { Item } from "../../components/DnDList/DnDList";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getAnnotations],
    (annotations: Annotation[]): Item[] => {
        return map(annotations, (annotation) => ({
            description: annotation.description,
            id: annotation.name,
            title: annotation.displayName,
        }));
    }
);

export const getHierarchyListItems = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotations: Annotation[]): Item[] => {
        return map(annotations, (annotation) => ({
            description: annotation.description,
            id: annotation.name,
            title: annotation.displayName,
        }));
    }
);
