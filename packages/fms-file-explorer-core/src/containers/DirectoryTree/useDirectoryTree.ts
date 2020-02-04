import { isEmpty, reduce, without } from "lodash";
import * as React from "react";

import FileFilter from "../../entity/FileFilter";
import FileService from "../../services/FileService";
import FileSet from "../../entity/FileSet";

export interface TreeNode {
    depth: number;
    fileSet: FileSet;
    isCollapsed?: boolean;
    isLeaf?: boolean;
    isRoot?: boolean;
}

export default function useDirectoryTree(fileFilters: FileFilter[][], fileService: FileService) {
    const [expandedTreeNodes, setExpandedTreeNodes] = React.useState(() => new Set<string>());
    const [directoryTree, setDirectoryTree] = React.useState(() => new Map<number, TreeNode>());
    const [isLoading, setIsLoading] = React.useState(false);
    const fileSetSizeCache = React.useRef(new Map<string, boolean>());

    // Note, classic antipattern: "derive state from props."
    // Here it's warranted. Following traditional advice to lift this state out
    // of this component would be too much indirection, and instructing React to
    // replace the component (using key) would be very sub-optimal user-experience
    // (leads to flashes of content).
    React.useEffect(() => {
        setExpandedTreeNodes(new Set<string>());
    }, [fileFilters, setExpandedTreeNodes]);

    React.useEffect(() => {
        // if this component is unmounted before this effect is finished running, this mutable
        // var provides a mechanism for "bailing" out of setState calls
        let bail = false;

        const hierarchyDepth = fileFilters.length;

        /**
         * Depth-first traversal of a level of the annotation hierarchy (array of FileFilters).
         *
         * If `parentTree` is supplied, the traversal at this level is appended to.
         * If `ancestralFilters` is supplied, each filter at the given depth will be appended to `ancestralFilters`.
         */
        async function traverseHierarchyFromDepth(
            depth: number,
            parentTree: TreeNode[] = [],
            ancestralFilters: FileFilter[] = []
        ): Promise<TreeNode[]> {
            return await reduce(
                fileFilters[depth],
                async (constructionOfSiblingFileSetTrees, currentFilter) => {
                    const siblingTrees = await constructionOfSiblingFileSetTrees;
                    return [
                        ...siblingTrees,
                        // Disable no-use-before-define because these two functions reference each other
                        // eslint-disable-next-line @typescript-eslint/no-use-before-define
                        ...(await constructDirectoryTree(
                            [...ancestralFilters, currentFilter],
                            depth
                        )),
                    ];
                },
                Promise.resolve(parentTree)
            );
        }

        /**
         * Starting from a list of FileFilters and the depth of the annotation hierarchy
         * from which the last of those FileFilters came from, determine if the FileSet
         * represented by those FileFilters is non-empty, and if so, continue walking
         * down the annotation hierachy if not already at the last level.
         */
        async function constructDirectoryTree(
            filters: FileFilter[],
            depth: number
        ): Promise<TreeNode[]> {
            const fileSet = new FileSet({ filters, fileService });
            const queryString = fileSet.toQueryString();
            const nextDepth = depth + 1;

            const isCollapsed = () => {
                const collapsed = !expandedTreeNodes.has(queryString);
                return collapsed;
            };

            if (bail) {
                return [];
            }

            if (nextDepth >= hierarchyDepth) {
                // At the leaf hierarchy level, so do not try to traverse any further down
                const parentFilters = filters.slice(0, filters.length - 1);
                const parentQueryString = new FileSet({ filters: parentFilters }).toQueryString();
                const parentsFiltersProduceEmptySet = fileSetSizeCache.current.get(
                    parentQueryString
                );
                const currentFiltersProduceEmptySet = fileSetSizeCache.current.get(queryString);
                if (parentsFiltersProduceEmptySet || currentFiltersProduceEmptySet) {
                    return [];
                }

                const emptyFileSet = await fileSet.isEmpty();
                fileSetSizeCache.current.set(fileSet.toQueryString(), emptyFileSet);
                if (emptyFileSet) {
                    return [];
                }
                return [{ depth, fileSet, isLeaf: true, isCollapsed: true }]; // TODO
            }

            const currentNode = { depth, fileSet, isCollapsed: isCollapsed() };
            const root = [currentNode];
            const tree = await traverseHierarchyFromDepth(nextDepth, root, filters);
            const children = without(tree, currentNode);

            if (isEmpty(children)) {
                return [];
            }

            if (currentNode.isCollapsed) {
                return root;
            }

            return tree;
        }

        if (isEmpty(fileFilters)) {
            setDirectoryTree(() => {
                const nextDirectoryTree = new Map<number, TreeNode>();
                nextDirectoryTree.set(0, {
                    depth: 0,
                    fileSet: new FileSet({ fileService }),
                    isRoot: true,
                });
                return nextDirectoryTree;
            });
        } else {
            setIsLoading(true);

            traverseHierarchyFromDepth(0)
                .then((tree) => {
                    if (!bail) {
                        setDirectoryTree(() => {
                            const nextDirectoryTree = new Map<number, TreeNode>();
                            tree.forEach((node, index) => {
                                nextDirectoryTree.set(index, node);
                            });
                            return nextDirectoryTree;
                        });
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }

        return function cleanUp() {
            bail = true;
        };
    }, [fileFilters, fileService, expandedTreeNodes, setDirectoryTree]);

    const onExpandCollapse = (fileSet: FileSet) => {
        const nextExpandedTreeNodes = new Set<string>(expandedTreeNodes.values());
        const qs = fileSet.toQueryString();
        if (nextExpandedTreeNodes.has(qs)) {
            nextExpandedTreeNodes.delete(qs);
        } else {
            nextExpandedTreeNodes.add(qs);
        }

        setExpandedTreeNodes(nextExpandedTreeNodes);
    };

    return { directoryTree, onExpandCollapse, isLoading };
}
