import { map } from "lodash";
import { createSelector } from "reselect";

import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

export interface AnnotationItem {
    id: string; // a unique identifier for the annotation, e.g., annotation.name
    description: string;
    title: string; // the value to display, e.g., annotation.displayName
}

export const getAnnotationListItems = createSelector(
    [metadata.selectors.getAnnotations],
    (annotations: Annotation[]): AnnotationItem[] => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            description: annotation.description,
            title: annotation.displayName,
        }));
    }
);

export const getHierarchyListItems = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotations: Annotation[]): AnnotationItem[] => {
        return map(annotations, (annotation) => ({
            id: annotation.name,
            description: annotation.description,
            title: annotation.displayName,
        }));
    }
);

export const makeAnnotationIsFilteredSelector = () =>
    createSelector(
        selection.selectors.getFileFilters,
        (_: any, annotationName: string) => annotationName,
        (filters, annotationName) => {
            return filters.some((filter) => filter.name === annotationName);
        }
    );
