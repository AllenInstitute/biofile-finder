import { isEmpty, reduce } from "lodash";
import * as React from "react";

import FileFilter from "../../entity/FileFilter";
import FileService from "../../services/FileService";
import FileSet from "../../entity/FileSet";

async function fileSetIsEmpty(fileSet: FileSet, fileService: FileService) {
    const qs = fileSet.toQueryString();
    const count = await fileService.getCountOfMatchingFiles(qs);
    return count < 1;
}

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

    React.useEffect(() => {
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
            const tree: TreeNode[] = [];
            const fileSet = new FileSet({ filters, fileService });
            const queryString = fileSet.toQueryString();
            const nextDepth = depth + 1;

            const isCollapsed = () => {
                const collapsed = !expandedTreeNodes.has(queryString);
                return collapsed;
            };

            if (bail || (await fileSetIsEmpty(fileSet, fileService))) {
                return tree;
            }

            if (nextDepth >= hierarchyDepth) {
                // At the leaf hierarchy level, so do not try to traverse any further down
                tree.push({ depth, fileSet, isLeaf: true, isCollapsed: true }); // TODO
                return tree;
            }

            tree.push({ depth, fileSet });

            if (isCollapsed()) {
                return tree;
            }

            return await traverseHierarchyFromDepth(nextDepth, tree, filters);
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
            traverseHierarchyFromDepth(0).then((tree) => {
                if (!bail) {
                    setDirectoryTree(() => {
                        const nextDirectoryTree = new Map<number, TreeNode>();
                        tree.forEach((node, index) => {
                            nextDirectoryTree.set(index, node);
                        });
                        return nextDirectoryTree;
                    });
                }
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

        console.log(Array.from(nextExpandedTreeNodes.values()));
        setExpandedTreeNodes(nextExpandedTreeNodes);
    };

    return { directoryTree, onExpandCollapse };
}
