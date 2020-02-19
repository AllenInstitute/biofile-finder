import { find } from "lodash";
import { createSelector } from "reselect";

import { metadata, selection, State } from "../../state";

export const makeFilterItemsSelector = () =>
    createSelector(
        metadata.selectors.getAnnotations,
        selection.selectors.getFileFilters,
        (_: State, annotationName: string) => annotationName,
        (annotations, filters, annotationName) => {
            const appliedFilters = filters
                .filter((filter) => filter.name === annotationName)
                .map((filter) => filter.value);
            const annotation = find(
                annotations,
                (annotation) => annotation.name === annotationName
            );
            const values = annotation ? annotation.values : [];
            return values.map((value) => ({
                checked: appliedFilters.includes(value),
                displayValue: annotation ? annotation.getDisplayValue(value) : value,
                value,
            }));
        }
    );
