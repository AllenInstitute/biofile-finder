import { map } from "lodash";
import { createSelector } from "reselect";

import { Item } from "../../components/DnDList/DnDList";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getAnnotations],
    (annotations: Annotation[]): Item[] => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            description: annotation.description,
            title: annotation.displayName,
        }));
    }
);

export const getHierarchyListItems = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotations: Annotation[]): Item[] => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            description: annotation.description,
            title: annotation.displayName,
        }));
    }
);
