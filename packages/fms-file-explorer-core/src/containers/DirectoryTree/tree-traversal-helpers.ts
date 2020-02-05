import { initial, isEmpty, reduce, without } from "lodash";
import LRUCache from "lru-cache";

import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import FileService from "../../services/FileService";

export interface TreeNode {
    depth: number;
    fileSet: FileSet;
    isCollapsed?: boolean;
    isLeaf?: boolean;
    isRoot?: boolean;
}

interface HierarchyTraversalParams {
    ancestralFilters?: FileFilter[];
    depth: number;
    expandedTreeNodes: Set<string>;
    fileService: FileService;
    hierarchy: FileFilter[][];
    parentTree?: TreeNode[];
}

/**
 * Depth-first traversal of a level of the annotation hierarchy (array of FileFilters).
 *
 * If `parentTree` is supplied, the traversal at this level is appended to.
 * If `ancestralFilters` is supplied, each filter at the given depth will be appended to `ancestralFilters`.
 */
export async function traverseHierarchyFromDepth(
    params: HierarchyTraversalParams
): Promise<TreeNode[]> {
    const {
        depth,
        expandedTreeNodes,
        fileService,
        hierarchy,
        parentTree = [],
        ancestralFilters = [],
    } = params;

    return await reduce(
        hierarchy[depth],
        async (constructionOfSiblingFileSetTrees, currentFilter) => {
            const siblingTrees = await constructionOfSiblingFileSetTrees;
            return [
                ...siblingTrees,
                // Disable no-use-before-define because these two functions reference each other
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                ...(await constructDirectoryTree({
                    currentDepth: depth,
                    expandedTreeNodes,
                    filters: [...ancestralFilters, currentFilter],
                    fileService,
                    hierarchy,
                })),
            ];
        },
        Promise.resolve(parentTree)
    );
}

interface ConstructDirectoryTreeParams {
    currentDepth: number;
    expandedTreeNodes: Set<string>;
    filters: FileFilter[];
    fileService: FileService;
    hierarchy: FileFilter[][];
}

const ARBITRARILY_LARGE_MAX_CACHE_SIZE = 50000;
const fileSetIsEmptyCache = new LRUCache<string, boolean>({
    max: ARBITRARILY_LARGE_MAX_CACHE_SIZE,
});
const hierarchyCache = new LRUCache<string, TreeNode[]>({ max: ARBITRARILY_LARGE_MAX_CACHE_SIZE });

/**
 * Starting from a list of FileFilters and the depth of the annotation hierarchy
 * from which the last of those FileFilters came from, determine if the FileSet
 * represented by those FileFilters is non-empty, and if so, continue walking
 * down the annotation hierachy if not already at the last level.
 */
export async function constructDirectoryTree(
    params: ConstructDirectoryTreeParams
): Promise<TreeNode[]> {
    const { currentDepth, expandedTreeNodes, filters, fileService, hierarchy } = params;
    const fileSet = new FileSet({ filters, fileService });
    const queryString = fileSet.toQueryString();
    const totalDepth = hierarchy.length;
    const nextDepth = currentDepth + 1;

    const isCollapsed = () => !expandedTreeNodes.has(queryString);

    // Leaf node
    if (nextDepth >= totalDepth) {
        const currentFileSetIsEmpty = await fileSet.isEmpty();
        if (currentFileSetIsEmpty) {
            return [];
        }

        return [{ depth: currentDepth, fileSet, isLeaf: true, isCollapsed: isCollapsed() }];
    }

    // If the parent to this node is known to produce an empty set,
    // or this file set itself is known to produce an empty set,
    // no need to go any further
    const parentFileSet = new FileSet({ filters: initial(filters), fileService });
    const parentQueryString = parentFileSet.toQueryString();
    const parentFileSetKnownToBeEmpty = fileSetIsEmptyCache.get(parentQueryString);
    const currentFileSetKnownToBeEmpty = fileSetIsEmptyCache.get(queryString);
    if (parentFileSetKnownToBeEmpty || currentFileSetKnownToBeEmpty) {
        return [];
    }

    const currentNode = { depth: currentDepth, fileSet, isCollapsed: isCollapsed() };
    const root = [currentNode];

    if (hierarchyCache.has(queryString) && !currentNode.isCollapsed) {
        hierarchyCache.del(queryString);
    }

    let tree;
    const cachedTree = hierarchyCache.get(queryString);
    if (cachedTree) {
        tree = cachedTree;
    } else {
        tree = await traverseHierarchyFromDepth({
            ancestralFilters: filters,
            depth: nextDepth,
            expandedTreeNodes,
            fileService,
            hierarchy,
            parentTree: root,
        });
        hierarchyCache.set(queryString, tree);
    }

    // Inspect tree without root: if root is childless, do not show this branch
    const children = without(tree, currentNode);
    if (isEmpty(children)) {
        fileSetIsEmptyCache.set(queryString, true);
        return [];
    }

    if (currentNode.isCollapsed) {
        return root;
    }

    return tree;
}
