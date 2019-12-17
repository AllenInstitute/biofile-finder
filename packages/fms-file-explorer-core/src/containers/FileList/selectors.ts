import { groups } from "d3-array";
import { castArray, isArray, isEmpty, flatten, map, reduce } from "lodash";
import { createSelector } from "reselect";

import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import { metadata, selection } from "../../state";

/**
 * Cartesian product helper func.
 *
 * Example inputs/outputs:
 *  a = [1, 2]
 *  b = [3, 4]
 *  return = [[1, 3], [1, 4], [2, 3], [2, 4]]
 *
 *  a = [[1, 3], [1, 4], [2, 3], [2, 4]]
 *  b = ["five", "six"]
 *  return = [[1, 3, "five"], [1, 3, "six"],
 *            [1, 4, "five"], [1, 4, "six"],
 *            [2, 3, "five"], [2, 3, "six"],
 *            [2, 4, "five"], [2, 4, "six"]]
 */
function product(a: any[], b: any[]): any[][] {
    // for each element in the first array, loop over the second array...
    return flatten(
        map(a, (outer): any[][] =>
            map(b, (inner): any[] =>
                // ...return a nested array that contains the element(s) from the outer loop and the element from the inner loop
                [...castArray(outer), inner]
            )
        )
    );
}

function cartesianProduct(...args: any[][]): any[][] {
    const [a = [], b = [], ...rest] = args;
    if (isEmpty(b)) {
        if (isArray(a[0])) {
            return a;
        }
        return map(a, (inner) => castArray(inner));
    }
    const [c = [], ...d] = rest;
    const ab = product(a, b);
    return cartesianProduct(ab, c, ...d);
}

/**
 * TODO
 */
export const getFileFilters = createSelector(
    [selection.selectors.getAnnotationHierarchy, metadata.selectors.getAnnotationNameToValuesMap],
    (annotationHierarchy, annotationNameToValuesMap): FileFilter[][] => {
        const fileFilters = reduce(
            annotationHierarchy,
            (accum, annotation) => {
                // only include those annotations that we have values for
                if (annotationNameToValuesMap[annotation.name] !== undefined) {
                    const filters = map(
                        annotationNameToValuesMap[annotation.name],
                        (val) => new FileFilter(annotation.name, val)
                    );
                    accum.push(filters);
                    return accum;
                }

                return accum;
            },
            [] as FileFilter[][]
        );
        return cartesianProduct(...fileFilters);
    }
);

/**
 * TODO
 */
export const getFileSetTree = createSelector(
    [getFileFilters],
    (fileFilters) => {
        if (isEmpty(fileFilters)) {
            return [null, [new FileSet()]];
        }

        const fileSets = map(fileFilters, (filters: FileFilter[]) => new FileSet({ filters }));
        const numKeyFuncs = fileFilters[0].length;
        const keyFuncs = Array.from({ length: numKeyFuncs }).map((_, i) => (fileSet: FileSet):
            | string
            | number
            | boolean => fileSet.filters[i].value);
        return groups(fileSets, ...keyFuncs);
    }
);
