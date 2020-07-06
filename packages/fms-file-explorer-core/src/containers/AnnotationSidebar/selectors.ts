import { map } from "lodash";
import { createSelector } from "reselect";

import { DnDItem } from "../../components/DnDList/DnDList";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getAnnotations],
    (annotations: Annotation[]): DnDItem[] => {
        return map(annotations, (annotation) => ({
            description: annotation.description,
            id: annotation.name,
            title: annotation.displayName,
        }));
    }
);

export const getHierarchyListItems = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotations: Annotation[]): DnDItem[] => {
        return map(annotations, (annotation) => ({
            description: annotation.description,
            id: annotation.name,
            title: annotation.displayName,
        }));
    }
);

export const getNonCombinableAnnotationsForHierarchy = createSelector(
    [
        getAnnotationListItems,
        selection.selectors.getCombinableAnnotationsForHierarchy,
        selection.selectors.getAnnotationHierarchy,
    ],
    (annotations: DnDItem[], combinableAnnotations: string[], hierarchy: Annotation[]): DnDItem[] =>
        hierarchy.length
            ? annotations.filter((annotation) => !combinableAnnotations.includes(annotation.id))
            : []
);
