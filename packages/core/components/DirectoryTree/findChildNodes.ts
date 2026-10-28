import { defaults, isEmpty, pull } from "lodash";

import { NO_VALUE_NODE, ROOT_NODE } from "./directory-hierarchy-state";
import { FilterType } from "../../entity/FileFilter";
import NoValueFilter from "../../entity/FileFilter/NoValueFilter";
import FileSet from "../../entity/FileSet";
import { CancellablePromise } from "../../entity/types";
import { AnnotationService, FileService } from "../../services";
import { naturalComparator } from "../../util/strings";

export interface FindChildNodesParams {
    ancestorNodes?: string[];
    currentNode: string;
    hierarchy: string[];
    annotationService: AnnotationService;
    fileService: FileService;
    fileSet: FileSet;
    shouldShowNullGroups?: boolean;
}

const DEFAULTS = {
    ancestorNodes: [],
    currentNode: ROOT_NODE,
    shouldShowNullGroups: false,
};

export function findChildNodes(params: FindChildNodesParams): CancellablePromise<string[]> {
    const {
        ancestorNodes,
        currentNode,
        fileSet,
        hierarchy,
        annotationService,
        fileService,
        shouldShowNullGroups,
    } = defaults({}, params, DEFAULTS);

    const isRoot = currentNode === ROOT_NODE;
    // If at root of hierarchy, currentNode will be set to "ROOT_NODE"
    // We trim that from the path as it is not meaningful in this context
    const pathToNode = pull([...ancestorNodes, currentNode], ROOT_NODE);

    let values: string[] = [];

    const depth = pathToNode.length;
    const annotationNameAtDepth = hierarchy[depth];

    // stores the cancel function for the currently active query
    let activePromiseCancel: ((reason?: string) => void) | undefined;

    const valuesPromise = (async () => {
        let hasNullValueFile = false;
        if (shouldShowNullGroups) {
            // Check whether we should include the 'no value' folder by getting a count
            const hasNullValueFileQuery = fileService.hasMatchingFiles(
                new FileSet({
                    fileService,
                    filters: [...fileSet.filters, new NoValueFilter(annotationNameAtDepth)],
                })
            );
            activePromiseCancel = hasNullValueFileQuery.cancel;
            hasNullValueFile = await hasNullValueFileQuery.promise; // immediately invoke
            activePromiseCancel = undefined; // Unset since done querying
        }

        const isExcludeFilterApplied = fileSet.filters.some(
            (filter) => filter.name === annotationNameAtDepth && filter.type === FilterType.NO_VALUE
        );
        if (isExcludeFilterApplied) {
            // User does not want files with this annotation; don't return any non-null values.
            return shouldShowNullGroups && hasNullValueFile ? [NO_VALUE_NODE] : [];
        }

        const userSelectedFiltersForCurrentAnnotation = fileSet.filters
            .filter(
                (filter) =>
                    filter.name === annotationNameAtDepth &&
                    !filter.value.toString().includes("RANGE") && // 'RANGE' filters are handled by the value fetching endpoint
                    filter.hasValue // "any value" filters have a blank value and shouldn't be counted here
            )
            // Filter values may be numbers (e.g. from a URL) while node values are strings
            .map((filter) => String(filter.value));
        const isRangeFilterApplied = fileSet.filters.some(
            (filter) =>
                filter.name === annotationNameAtDepth && String(filter.value).includes("RANGE")
        );

        if (shouldShowNullGroups) {
            // Fetch all values under current node, ignoring past hierarchy
            // Including the full hierarchy would filter out files that miss any part of the hierarchy
            const { promise, cancel } = annotationService.fetchRootHierarchyValues(
                [annotationNameAtDepth],
                fileSet.filters
            );
            activePromiseCancel = cancel;
            values = await promise;
            activePromiseCancel = undefined;
        } else if (isRoot) {
            const { promise, cancel } = annotationService.fetchRootHierarchyValues(
                hierarchy,
                fileSet.filters
            );
            activePromiseCancel = cancel;
            values = await promise;
            activePromiseCancel = undefined;
        } else {
            const { promise, cancel } = annotationService.fetchHierarchyValuesUnderPath(
                hierarchy,
                pathToNode,
                fileSet.filters
            );
            activePromiseCancel = cancel;
            values = await promise;
            activePromiseCancel = undefined;
        }

        // If the annotation is in 'includeFilters' or if no filters are applied, we can use all the values
        let filteredValues = values;
        // If specific value filter(s) are selected for this annotation, we should only use the selected values
        // unless a range is also applied, in which case values within the range are valid too
        if (!isEmpty(userSelectedFiltersForCurrentAnnotation) && !isRangeFilterApplied) {
            const isFuzzyFilterApplied = fileSet.filters.some(
                (filter) =>
                    filter.name === annotationNameAtDepth && filter.type === FilterType.FUZZY
            );
            if (isFuzzyFilterApplied) {
                // Multiple search values may be committed for one annotation; keep
                // any node value that matches at least one of them
                filteredValues = values.filter((value) =>
                    userSelectedFiltersForCurrentAnnotation.some((filterValue) =>
                        value.includes(filterValue)
                    )
                );
            } else {
                filteredValues = values.filter((value) =>
                    userSelectedFiltersForCurrentAnnotation.includes(value)
                );
            }
        }

        const filteredValuesSorted = filteredValues.sort(naturalComparator);
        // Don't add NO_VALUE_NODE if there are user-applied filters for the annotation
        if (
            shouldShowNullGroups &&
            hasNullValueFile &&
            !userSelectedFiltersForCurrentAnnotation.length
        ) {
            return [...filteredValuesSorted, NO_VALUE_NODE];
        }
        return filteredValuesSorted;
    })();
    return { promise: valuesPromise, cancel: (reason?: string) => activePromiseCancel?.(reason) };
}
