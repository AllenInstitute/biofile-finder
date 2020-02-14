import { find } from "lodash";
import { createSelector } from "reselect";

import { metadata, selection } from "../../state";

export const makeFilterItemsSelector = () =>
    createSelector(
        metadata.selectors.getAnnotations,
        selection.selectors.getFileFilters,
        (_: any, annotationName: string) => annotationName,
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
                value,
            }));
        }
    );
