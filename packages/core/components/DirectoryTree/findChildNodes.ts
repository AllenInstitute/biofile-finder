import { defaults, isEmpty, pull } from "lodash";

import { NO_VALUE_NODE, ROOT_NODE } from "./directory-hierarchy-state";
import FileSet from "../../entity/FileSet";
import ExcludeFilter from "../../entity/FileFilter/ExcludeFilter";
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

export async function findChildNodes(params: FindChildNodesParams): Promise<string[]> {
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
    if (fileSet.excludeFilters?.some((filter) => filter.name === annotationNameAtDepth)) {
        // User does not want files with this annotation; don't return any non-null values.
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

    // If the annotation is in 'includeFilters' or if no filters are applied, we can use all the values
    let filteredValues = values;
    // If filter(s) are selected for this annotation, we should only use the selected values
    if (!isEmpty(userSelectedFiltersForCurrentAnnotation)) {
        if (fileSet.fuzzyFilters?.some((fuzzy) => fuzzy.name === annotationNameAtDepth)) {
            filteredValues = values.filter((value) =>
                value.includes(userSelectedFiltersForCurrentAnnotation[0])
            );
        } else {
            filteredValues = values.filter((value) =>
                userSelectedFiltersForCurrentAnnotation.includes(value)
            );
        }
    }

    const filteredValuesSorted = filteredValues.sort(naturalComparator);
    if (!shouldShowNullGroups || userSelectedFiltersForCurrentAnnotation.length) {
        return filteredValuesSorted;
    } else {
        // Check whether we should include the 'no value' folder by getting a count
        const noValueCount = await fileService.getCountOfMatchingFiles(
            new FileSet({
                fileService,
                filters: [...fileSet.filters, new ExcludeFilter(annotationNameAtDepth)],
            })
        );
        return noValueCount > 0 ? [...filteredValuesSorted, NO_VALUE_NODE] : filteredValuesSorted;
    }
}
