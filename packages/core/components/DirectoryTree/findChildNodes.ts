import { defaults, isEmpty, pull } from "lodash";

import FileFilter, { FilterType } from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import { AnnotationService } from "../../services";
import { naturalComparator } from "../../util/strings";
import { NO_VALUE_NODE, ROOT_NODE } from "./directory-hierarchy-state";

export interface FindChildNodesParams {
    ancestorNodes?: string[];
    currentNode: string;
    hierarchy: string[];
    annotationService: AnnotationService;
    fileSet?: FileSet;
    selectedFileFilters?: FileFilter[];
    shouldShowNullGroups: boolean;
}

const DEFAULTS = {
    ancestorNodes: [],
    currentNode: ROOT_NODE,
    selectedFileFilters: [],
};

export async function findChildNodes(params: FindChildNodesParams): Promise<string[]> {
    const {
        ancestorNodes,
        currentNode,
        fileSet,
        hierarchy,
        annotationService,
        selectedFileFilters,
        shouldShowNullGroups,
    } = defaults({}, params, DEFAULTS);

    const isRoot = currentNode === ROOT_NODE;

    const combinedFileFilters = selectedFileFilters.concat(
        (fileSet?.filters || [])?.filter((filter) => !selectedFileFilters.includes(filter))
    );
    const includeFilters = combinedFileFilters
        .filter((f) => f.type === FilterType.ANY)
        .concat(fileSet?.includeFilters || []);
    const excludeFilters = combinedFileFilters
        .filter((f) => f.type === FilterType.EXCLUDE)
        .concat(fileSet?.excludeFilters || []);
    const fuzzyFilters = combinedFileFilters
        .filter((f) => f.type === FilterType.FUZZY)
        .concat(fileSet?.fuzzyFilters || []);

    // if at root of hierarchy, currentNode will be set to the sentinal "ROOT_NODE"
    // we need to trim that from the path as its not meaningful in this context
    const pathToNode = pull([...ancestorNodes, currentNode], ROOT_NODE);

    let values: string[] = [];

    const depth = pathToNode.length;
    const annotationNameAtDepth = hierarchy[depth];
    const userSelectedFiltersForCurrentAnnotation = combinedFileFilters
        .filter((filter) => filter.name === annotationNameAtDepth)
        .filter((filter) => filter.type !== FilterType.EXCLUDE)
        .map((filter) => filter.value);

    if (isRoot) {
        const rootHierarchy = shouldShowNullGroups ? [annotationNameAtDepth] : hierarchy;
        values = await annotationService.fetchRootHierarchyValues(
            rootHierarchy,
            combinedFileFilters
        );
    } else if (shouldShowNullGroups) {
        values = await annotationService.fetchRootHierarchyValues(
            [annotationNameAtDepth],
            combinedFileFilters
        );
    } else {
        values = await annotationService.fetchHierarchyValuesUnderPath(
            hierarchy,
            pathToNode,
            combinedFileFilters
        );
    }

    const filteredValues = values
        .filter((value) => {
            if (includeFilters?.some((filter) => filter.name === annotationNameAtDepth))
                return true;
            if (excludeFilters?.some((filter) => filter.name === annotationNameAtDepth))
                return false;
            if (!isEmpty(userSelectedFiltersForCurrentAnnotation)) {
                if (fuzzyFilters?.some((fuzzy) => fuzzy.name === annotationNameAtDepth)) {
                    // There can only be one selected value for fuzzy search, so reverse match
                    return value.includes(userSelectedFiltersForCurrentAnnotation[0]);
                }
                return userSelectedFiltersForCurrentAnnotation.includes(value);
            }
            return true;
        })
        .map((value) => value.toString())
        .sort(naturalComparator);

    // Don't include the "NO VALUE" folder if we're already applying filters on this annotation
    // unless it's an exclude filter
    const allChildNodes =
        !shouldShowNullGroups || userSelectedFiltersForCurrentAnnotation.length
            ? filteredValues
            : [...filteredValues, NO_VALUE_NODE];
    return allChildNodes;
}
