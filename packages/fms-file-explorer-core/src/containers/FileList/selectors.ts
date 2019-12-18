import { cross, groups } from "d3-array";
import { isEmpty, map, reduce } from "lodash";
import { createSelector } from "reselect";

import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import { metadata, selection } from "../../state";

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
        return cross(...fileFilters);
    }
);

/**
 * TODO
 */
export type Grouping = [string | number | boolean | null, (FileSet[] | Grouping)];

export const getFileSetTree = createSelector(
    [getFileFilters],
    (fileFilters): Grouping => {
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
