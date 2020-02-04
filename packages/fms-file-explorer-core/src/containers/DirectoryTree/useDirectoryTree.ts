import { isEmpty } from "lodash";
import * as React from "react";

import FileFilter from "../../entity/FileFilter";
import FileService from "../../services/FileService";
import FileSet from "../../entity/FileSet";
import { traverseHierarchyFromDepth, TreeNode } from "./tree-traversal-helpers";

export default function useDirectoryTree(fileFilters: FileFilter[][], fileService: FileService) {
    const [expandedTreeNodes, setExpandedTreeNodes] = React.useState(() => new Set<string>());
    const [directoryTree, setDirectoryTree] = React.useState(() => new Map<number, TreeNode>());
    const [isLoading, setIsLoading] = React.useState(false);

    // Note, classic antipattern: "derive state from props."
    // Here it's warranted. Following traditional advice to lift this state out
    // of this component would be too much indirection, and instructing React to
    // replace the component (using key) would be very sub-optimal user-experience
    // (leads to flashes of content).
    React.useEffect(() => {
        setExpandedTreeNodes(new Set<string>());
    }, [fileFilters, setExpandedTreeNodes]);

    React.useEffect(() => {
        // If this component is unmounted before this effect is finished running, this mutable
        // var provides a mechanism for "bailing" out of setState calls
        let bail = false;

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

            traverseHierarchyFromDepth({
                depth: 0,
                expandedTreeNodes,
                fileService,
                hierarchy: fileFilters,
            })
                .then((tree) => {
                    if (!bail) {
                        setDirectoryTree(() => {
                            const nextDirectoryTree = tree.map<[number, TreeNode]>(
                                (node, index) => [index, node]
                            );
                            return new Map<number, TreeNode>(nextDirectoryTree);
                        });
                    }
                })
                .finally(() => {
                    if (!bail) {
                        setIsLoading(false);
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

        setExpandedTreeNodes(nextExpandedTreeNodes);
    };

    return { directoryTree, onExpandCollapse, isLoading };
}
