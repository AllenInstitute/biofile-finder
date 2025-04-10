import { defaults, isEmpty, pull } from "lodash";

import { NO_VALUE_NODE, ROOT_NODE } from "./directory-hierarchy-state";
import FileSet from "../../entity/FileSet";
import { AnnotationService } from "../../services";
import { naturalComparator } from "../../util/strings";

export interface FindChildNodesParams {
    ancestorNodes?: string[];
    currentNode: string;
    hierarchy: string[];
    annotationService: AnnotationService;
    fileSet: FileSet;
    shouldShowNullGroups?: boolean;
}

const DEFAULTS = {
    ancestorNodes: [],
    currentNode: ROOT_NODE,
    shouldShowNullGroups: false,
};

export async function findChildNodes(params: FindChildNodesParams): Promise<string[]> {
    const {
        ancestorNodes,
        currentNode,
        fileSet,
        hierarchy,
        annotationService,
        shouldShowNullGroups,
    } = defaults({}, params, DEFAULTS);

    const isRoot = currentNode === ROOT_NODE;
    // If at root of hierarchy, currentNode will be set to "ROOT_NODE"
    // We trim that from the path as it is not meaningful in this context
    const pathToNode = pull([...ancestorNodes, currentNode], ROOT_NODE);

    let values: string[] = [];

    const depth = pathToNode.length;
    const annotationNameAtDepth = hierarchy[depth];
    if (fileSet.excludeFilters?.some((filter) => filter.name === annotationNameAtDepth)) {
        // User does not want this annotation, don't return any values
        return shouldShowNullGroups ? [NO_VALUE_NODE] : [];
    }

    const userSelectedFiltersForCurrentAnnotation = fileSet.filters
        .filter((filter) => filter.name === annotationNameAtDepth)
        .map((filter) => filter.value);

    if (shouldShowNullGroups) {
        // Fetch all values under current node, ignoring past hierarchy
        // Including the full hierarchy would filter out files that miss any part of the hierarchy
        values = await annotationService.fetchRootHierarchyValues(
            [annotationNameAtDepth],
            fileSet.filters
        );
    } else if (isRoot) {
        values = await annotationService.fetchRootHierarchyValues(hierarchy, fileSet.filters);
    } else {
        values = await annotationService.fetchHierarchyValuesUnderPath(
            hierarchy,
            pathToNode,
            fileSet.filters
        );
    }

    let filteredValues: string[];
    if (fileSet.includeFilters?.some((filter) => filter.name === annotationNameAtDepth)) {
        // User wants this annotation
        filteredValues = values;
    } else if (!isEmpty(userSelectedFiltersForCurrentAnnotation)) {
        if (fileSet.fuzzyFilters?.some((fuzzy) => fuzzy.name === annotationNameAtDepth)) {
            filteredValues = values.filter((value) =>
                value.includes(userSelectedFiltersForCurrentAnnotation[0])
            );
        } else {
            filteredValues = values.filter((value) =>
                userSelectedFiltersForCurrentAnnotation.includes(value)
            );
        }
    } else {
        // No filters exclude this annotation
        filteredValues = values;
    }
    const filteredValuesSorted = filteredValues.sort(naturalComparator);

    // Don't include the "NO VALUE" folder if we're already applying filters on this annotation
    const allChildNodes =
        !shouldShowNullGroups || userSelectedFiltersForCurrentAnnotation.length
            ? filteredValuesSorted
            : [...filteredValuesSorted, NO_VALUE_NODE];
    return allChildNodes;
}
