import { isEmpty, map, reduce } from "lodash";
import { createSelector } from "reselect";

import FileFilter from "../../entity/FileFilter";
import FileService from "../../services/FileService";
import { interaction, selection } from "../../state";

/**
 * Given annotation hierarchy (list of annotations, in order, by which user wants files to be grouped), and all unique values for each of those annotations,
 * return a list of lists whereby each annotation in the hierarchy is projected into a list of FileFilters of that annotation's values.
 *
 * For example,
 * given:
 *  annotationHierarchy = [Annotation(name="A", values=[1, 2, 3]), Annotation(name="B", values=[true, false])]
 *
 * expect:
 *  return = [
 *              [FileFilter("A", 1), FileFilter("A", 2), FileFilter("A", 3)],
 *              [FileFilter("B", true), FileFilter("B", false)],
 *           ]
 */
export const getFileFilters = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotationHierarchy): FileFilter[][] => {
        return reduce(
            annotationHierarchy,
            (accum, annotation) => {
                // only include those annotations that we have values for
                if (!isEmpty(annotation.values)) {
                    const filters = map(
                        annotation.values,
                        (val) => new FileFilter(annotation.name, val)
                    );
                    accum.push(filters);
                    return accum;
                }

                return accum;
            },
            [] as FileFilter[][]
        );
    }
);

export const getFileService = createSelector(
    [interaction.selectors.getFileExplorerServiceBaseUrl],
    (fileExplorerBaseUrl) => {
        return new FileService({ baseUrl: fileExplorerBaseUrl });
    }
);

export const getDirectoryTreeComponentKey = createSelector(
    [selection.selectors.getAnnotationHierarchy],
    (annotationHierarchy): string => {
        return reduce(
            annotationHierarchy,
            (accum, annotation) => {
                // only include those annotations that we have values for
                if (!isEmpty(annotation.values)) {
                    return `${accum}${annotation.name}`;
                }

                return accum;
            },
            ""
        );
    }
);
