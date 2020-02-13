import { defaults, pull, zip } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import DirectoryTreeNode from "./DirectoryTreeNode";
import FileList from "../FileList";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import * as directoryTreeSelectors from "./selectors";

interface UseDirectoryHierarchyParams {
    ancestorNodes?: string[];
    currentNode?: string;
    initialCollapsed: boolean;
}

export const ROOT_NODE = "root_node_sentinal_value";

const DEFAULTS = {
    ancestorNodes: [],
    currentNode: ROOT_NODE,
};

/**
 * React hook to encapsulate all logic for constructing the directory hierarchy at a given depth
 * and path. Responsible for fetching any data required to do so.
 */
export default function useDirectoryHierarchy(params: UseDirectoryHierarchyParams) {
    const { ancestorNodes, currentNode, initialCollapsed } = defaults({}, params, DEFAULTS);
    const hierarchy = useSelector(directoryTreeSelectors.getHierarchy);
    const annotationService = useSelector(directoryTreeSelectors.getAnnotationService);
    const fileService = useSelector(directoryTreeSelectors.getFileService);

    const [collapsed, setCollapsed] = React.useState(initialCollapsed);
    const [content, setContent] = React.useState<JSX.Element | JSX.Element[] | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    const isRoot = currentNode === ROOT_NODE;
    const isLeaf = !isRoot && hierarchy.length && ancestorNodes.length === hierarchy.length - 1;

    React.useEffect(() => {
        let cancel = false;

        // nothing to do if the node is collapsed
        if (collapsed) {
            return;
        }

        setIsLoading(true);

        const path = pull([...ancestorNodes, currentNode], ROOT_NODE);

        async function getContent() {
            if (isLeaf || hierarchy.length === 0) {
                // if we're at the top or bottom of the hierarchy, render a FileList

                const filters: FileFilter[] = zip<string, string>(hierarchy, path).map((pair) => {
                    const [name, value] = pair as [string, string];
                    return new FileFilter(name, value);
                });

                const fileSet = new FileSet({
                    fileService,
                    filters,
                });

                try {
                    const totalCount = await fileSet.fetchTotalCount();
                    if (!cancel) {
                        setContent(<FileList fileSet={fileSet} totalCount={totalCount} />);
                        setError(null);
                    }
                } catch (e) {
                    console.error(
                        `Failed to fetch the total number of documents beloning to ${fileSet.toString()}`,
                        e
                    );
                    if (!cancel) {
                        if (!isRoot) {
                            setCollapsed(true);
                        }
                        setError(e);
                    }
                } finally {
                    if (!cancel) {
                        setIsLoading(false);
                    }
                }
            } else {
                // otherwise, there's more hierarchy to show
                try {
                    let values: any[];

                    if (isRoot) {
                        values = await annotationService.fetchRootHierarchyValues(hierarchy);
                    } else {
                        values = await annotationService.fetchHierarchyValuesUnderPath(
                            hierarchy,
                            path
                        );
                    }

                    const nodes = values.map((value) => (
                        <DirectoryTreeNode
                            key={`${[...path, value].join(":")}|${hierarchy.join(":")}`}
                            ancestorNodes={path}
                            currentNode={value}
                        />
                    ));

                    if (!cancel) {
                        setContent(nodes);
                        setError(null);
                    }
                } catch (e) {
                    console.error(
                        `Something went wrong fetching next level of hierarchy underneath ${path}`,
                        e
                    );

                    if (!cancel) {
                        if (!isRoot) {
                            setCollapsed(true);
                        }
                        setError(e);
                    }
                } finally {
                    if (!cancel) {
                        setIsLoading(false);
                    }
                }
            }
        }

        getContent();

        return function cleanUp() {
            cancel = true;
        };
    }, [ancestorNodes, currentNode, collapsed, annotationService, fileService, hierarchy]);

    return {
        collapsed,
        content,
        error,
        isLeaf,
        isLoading,
        setCollapsed,
    };
}
