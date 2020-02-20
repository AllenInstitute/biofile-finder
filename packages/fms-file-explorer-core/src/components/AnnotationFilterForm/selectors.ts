import { find } from "lodash";
import { createSelector } from "reselect";

import { AnnotationValue } from "../../entity/Annotation";

import { metadata, selection, State } from "../../state";

export const makeAnnotationSelector = () =>
    createSelector(
        metadata.selectors.getAnnotations,
        (_: State, annotationName: string) => annotationName,
        (annotations, annotationName) => {
            return find(annotations, (annotation) => annotation.name === annotationName);
        }
    );

const annotationSelector = makeAnnotationSelector();

export interface FilterItem {
    checked: boolean;
    displayValue: AnnotationValue;
    value: AnnotationValue;
}

export const makeFilterItemsSelector = () =>
    createSelector(
        selection.selectors.getFileFilters,
        (state: State, annotationName: string) => annotationSelector(state, annotationName),
        (_: State, annotationName: string) => annotationName,
        (filters, annotation, annotationName): FilterItem[] => {
            const appliedFilters = filters
                .filter((filter) => filter.name === annotationName)
                .map((filter) => filter.value);

            const values = annotation ? annotation.values : [];
            return values.map((value) => ({
                checked: appliedFilters.includes(value),
                displayValue: annotation ? annotation.getDisplayValue(value) : value,
                value,
            }));
        }
    );
