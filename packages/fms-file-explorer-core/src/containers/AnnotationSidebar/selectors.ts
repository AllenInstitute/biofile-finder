import { map } from "lodash";
import { createSelector } from "reselect";

import { DnDItem } from "../../components/DnDList/DnDList";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getSortedAnnotations],
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

export const getNonAvailableAnnotationsForHierarchy = createSelector(
    [
        getAnnotationListItems,
        selection.selectors.getAvailableAnnotationsForHierarchy,
        selection.selectors.getAnnotationHierarchy,
    ],
    (annotations: DnDItem[], availableAnnotations: string[], hierarchy: Annotation[]): DnDItem[] =>
        hierarchy.length
            ? annotations.filter((annotation) => !availableAnnotations.includes(annotation.id))
            : []
);
