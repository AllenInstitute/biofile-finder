import { defaults, isEmpty, find, pull, uniqWith, zip } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import DirectoryTreeNode from "./DirectoryTreeNode";
import {
    INITIAL_STATE,
    setError,
    showLoadingIndicator,
    State,
    receiveContent,
    reducer,
} from "./directory-hierarchy-state";
import FileList from "../FileList";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";
import * as directoryTreeSelectors from "./selectors";
import { interaction, metadata, selection } from "../../state";
import { naturalComparator } from "../../util/strings";

export interface UseDirectoryHierarchyParams {
    ancestorNodes?: string[];
    currentNode?: string;
    collapsed: boolean;
    fileSet: FileSet;
    sortOrder: number;
}

export interface UseAnnotationHierarchyReturnValue {
    isLeaf: boolean;
    state: State;
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
const useDirectoryHierarchy = (params: UseDirectoryHierarchyParams): UseAnnotationHierarchyReturnValue => {
    const { ancestorNodes, currentNode, collapsed, fileSet, sortOrder } = defaults({}, params, DEFAULTS);
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const hierarchy = useSelector(directoryTreeSelectors.getHierarchy);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const fileService = useSelector(interaction.selectors.getFileService);
    const selectedFileFilters = useSelector(selection.selectors.getFileFilters);
    const [state, dispatch] = React.useReducer(reducer, INITIAL_STATE);

    const isRoot = currentNode === ROOT_NODE;
    const isLeaf = !isRoot && !!hierarchy.length && ancestorNodes.length === hierarchy.length - 1;

    React.useEffect(() => {
        let cancel = false;

        // nothing to do if the node is collapsed
        if (collapsed) {
            return;
        }

        dispatch(showLoadingIndicator());

        // if at root of hierarchy, currentNode will be set to the sentinal "ROOT_NODE"
        // we need to trim that from the path as its not meaningful in this context
        const pathToNode = pull([...ancestorNodes, currentNode], ROOT_NODE);

        async function getContent() {
            if (isLeaf || hierarchy.length === 0) {
                // if we're at the top or bottom of the hierarchy, render a FileList
                try {
                    const totalCount = await fileSet.fetchTotalCount();
                    if (!cancel) {
                        dispatch(
                            receiveContent(
                                <FileList
                                    fileSet={fileSet}
                                    isRoot={isRoot}
                                    sortOrder={sortOrder}
                                    totalCount={totalCount}
                                />
                            )
                        );
                    }
                } catch (e) {
                    console.error(
                        `Failed to fetch the total number of documents belonging to ${fileSet.toString()}`,
                        e
                    );
                    if (!cancel) {
                        dispatch(setError(e, isRoot));
                    }
                }
            } else {
                // otherwise, there's more hierarchy to show
                try {
                    const depth = pathToNode.length;
                    const annotationNameAtDepth = hierarchy[depth];
                    const annotationAtDepth = find(
                        annotations,
                        (annotation) => annotation.name === annotationNameAtDepth
                    );
                    const userSelectedFiltersForCurrentAnnotation = selectedFileFilters
                        .filter((filter) => filter.name === annotationNameAtDepth)
                        .map((filter) => filter.value);

                    // TODO, send user-selected filters to backend
                    let values: any[];
                    if (isRoot) {
                        values = await annotationService.fetchRootHierarchyValues(hierarchy);
                    } else {
                        values = await annotationService.fetchHierarchyValuesUnderPath(
                            hierarchy,
                            pathToNode
                        );
                    }

                    const filteredValues = values.filter((value) => {
                        if (!isEmpty(userSelectedFiltersForCurrentAnnotation)) {
                            return userSelectedFiltersForCurrentAnnotation.includes(value);
                        }

                        return true;
                    });

                    const nodes = filteredValues
                        .sort(naturalComparator)
                        .map((value, idx) => {
                            let childNodeSortOrder: number;
                            if (isRoot) {
                                // First level of folders; use order produced by sort operation.
                                childNodeSortOrder = idx;
                            } else {
                                // Take into account sort order of parent folder(s) if not at first level.
                                // If at the second level, start to build up a float by separating parent sort
                                // order from child node order (as produced by sort operation).
                                // At increased depth of the hierarchy, add significant digits to the float.
                                // e.g.: 1 -> 1.1 -> 1.13 -> 1.130 -> 1.1304
                                childNodeSortOrder = Number.isInteger(sortOrder)
                                    ? Number.parseFloat(`${sortOrder}.${idx}`)
                                    : Number.parseFloat(`${sortOrder}${idx}`)
                            }

                            const pathToChildNode = [...pathToNode, value];
                            const hierarchyFilters: FileFilter[] = zip<string, string>(
                                hierarchy,
                                pathToChildNode
                            ).map((pair) => {
                                const [name, value] = pair as [string, string];
                                return new FileFilter(name, value);
                            });

                            // Filters are a combination of any user-selected filters and the filters
                            // at a particular path in the hierarchy.
                            //
                            // It's OK to have two annotation values used as filters for the same annotation.
                            // E.g., "workflow=Pipeline4.1&workflow=Pipeline4.2". This gives us an OR query. But, filter out
                            // duplicates to avoid querying by "workflow=Pipeline 4.4&workflow=Pipeline 4.4".
                            let userAppliedFilters = selectedFileFilters;
                            if (!isRoot) {
                                // When not at the root level, remove any user-applied filters for any annotation within the current path.
                                // E.g., if under the path "AICS-12" -> "ZSD-1", and a user has applied the filters FileFilter("cell_line", "AICS-12")
                                // and FileFilter("cell_line", "AICS-33"), we do not want to include the latter in the query for this FileList.
                                const hierarchyAnnotationNames = new Set(hierarchy);
                                userAppliedFilters = userAppliedFilters.filter(
                                    (f) => !hierarchyAnnotationNames.has(f.name)
                                );
                            }
                            const filters = uniqWith([...hierarchyFilters, ...userAppliedFilters], (a, b) =>
                                a.equals(b)
                            );

                            const childNodeFileSet = defaultFileSetFactory.create({
                                fileService,
                                filters,
                            });

                            return (
                                <DirectoryTreeNode
                                    key={`${pathToChildNode.join(":")}|${hierarchy.join(":")}`}
                                    ancestorNodes={pathToNode}
                                    currentNode={value}
                                    displayValue={annotationAtDepth?.getDisplayValue(value) || value}
                                    fileSet={childNodeFileSet}
                                    sortOrder={childNodeSortOrder}
                                />
                            );
                        });

                    if (!cancel) {
                        dispatch(receiveContent(nodes));
                    }
                } catch (e) {
                    console.error(
                        `Something went wrong fetching next level of hierarchy underneath ${pathToNode}`,
                        e
                    );

                    if (!cancel) {
                        dispatch(setError(e, isRoot));
                    }
                }
            }
        }

        getContent();

        return function cleanUp() {
            cancel = true;
        };
    }, [
        ancestorNodes,
        annotations,
        annotationService,
        currentNode,
        collapsed,
        fileService,
        hierarchy,
        isRoot,
        isLeaf,
        selectedFileFilters,
        sortOrder,
    ]);

    return {
        isLeaf,
        state,
    };
};

export default useDirectoryHierarchy;
