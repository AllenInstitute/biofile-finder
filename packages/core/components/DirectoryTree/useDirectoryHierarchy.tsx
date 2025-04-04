import { defaults, find, pull, take, uniqWith, zip } from "lodash";
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
    ROOT_NODE,
    NO_VALUE_NODE,
} from "./directory-hierarchy-state";
import { findChildNodes } from "./findChildNodes";
import FileList from "../FileList";
import FileFilter from "../../entity/FileFilter";
import ExcludeFilter from "../../entity/FileFilter/ExcludeFilter";
import FileSet from "../../entity/FileSet";
import { ValueError } from "../../errors";
import { interaction, metadata, selection } from "../../state";

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

const DEFAULTS = {
    ancestorNodes: [],
    currentNode: ROOT_NODE,
};

/**
 * Calculate a float sort order for a DirectoryTreeNode.
 * Takes into account sort order of parent folder(s). If at the second level,
 * start to build up a float by separating parent sort order from child node order.
 * At increased depth of the hierarchy, add significant digits to the float.
 * Refer to unit tests for example input/output.
 */
export function calcNodeSortOrder({
    idxWithinSourceList,
    parentDepth,
    parentSortOrder,
    sourceListLength,
}: {
    idxWithinSourceList: number;
    parentDepth: number;
    parentSortOrder: number;
    sourceListLength: number;
}): number {
    if (parentDepth < 1) {
        throw new ValueError(
            `parentDepth must be greater than 0 in order to calculate node sort order. Given: ${parentDepth}`
        );
    }

    // Take into account how many siblings this node needs to be sorted amongst.
    // E.g.: in a list of dozens of items, 0.1 is the same number as 0.10 (0.2 === 0.20, etc), so use 0.01, 0.02 instead.
    const maxPadLength = Math.floor(Math.log10(sourceListLength) + 1);
    const nodeOrder = String(idxWithinSourceList).padStart(maxPadLength, "0");

    // Because JS treats X.0, X.00, etc as the integer X, make sure that the true depth of this node
    // is factored into its sorting. See following demonstration of why this is necessary:
    // Without doing this |  With doing this
    //      1.0/                  1.0/
    //        1.00/                 1.000/
    //        1.01/                 1.001/
    //        ...                   ...
    //    !!! 1.79/ !!!         !!! 1.079/ !!!
    //      1.1/                  1.1/
    //        1.10/                 1.10/
    //        1.11/                 1.11/
    const ancestorNodeOrder =
        parentDepth > 1 && Number.isInteger(parentSortOrder)
            ? `${parentSortOrder}.${String(0).repeat(parentDepth)}`
            : parentSortOrder;

    return parentDepth === 1
        ? Number.parseFloat(`${parentSortOrder}.${nodeOrder}`)
        : Number.parseFloat(`${ancestorNodeOrder}${nodeOrder}`);
}

/**
 * React hook to encapsulate all logic for constructing the directory hierarchy at a given depth
 * and path. Responsible for fetching any data required to do so.
 */
const useDirectoryHierarchy = (
    params: UseDirectoryHierarchyParams
): UseAnnotationHierarchyReturnValue => {
    const { ancestorNodes, currentNode, collapsed, fileSet, sortOrder } = defaults(
        {},
        params,
        DEFAULTS
    );
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const hierarchy = useSelector(selection.selectors.getAnnotationHierarchy);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const fileService = useSelector(interaction.selectors.getFileService);
    const fuzzyFilters = useSelector(selection.selectors.getFuzzyFilters);
    const excludeFilters = useSelector(selection.selectors.getAnnotationsFilteredOut);
    const includeFilters = useSelector(selection.selectors.getAnnotationsRequired);
    const selectedFileFilters = useSelector(selection.selectors.getFileFilters);
    const sortColumn = useSelector(selection.selectors.getSortColumn);
    const shouldShowNullGroups = useSelector(selection.selectors.getShouldShowNullGroups);
    const [state, dispatch] = React.useReducer(reducer, {
        ...INITIAL_STATE,
        isLoading: !collapsed,
    });

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
                // unless we have cancelled or there is nothing to query against
                if (!cancel) {
                    dispatch(
                        receiveContent(
                            <FileList
                                fileSet={fileSet}
                                isRoot={isRoot}
                                sortOrder={sortOrder}
                                dispatch={dispatch}
                            />
                        )
                    );
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
                    const allChildNodes = await findChildNodes({
                        ancestorNodes,
                        currentNode,
                        fileSet,
                        selectedFileFilters,
                        hierarchy,
                        annotationService,
                        shouldShowNullGroups,
                    });
                    const nodes = allChildNodes.map((value, idx) => {
                        let childNodeSortOrder: number;
                        if (isRoot) {
                            // First level of folders; use order produced by sort operation.
                            childNodeSortOrder = idx;
                        } else {
                            childNodeSortOrder = calcNodeSortOrder({
                                idxWithinSourceList: idx,
                                parentDepth: depth,
                                parentSortOrder: sortOrder,
                                sourceListLength: allChildNodes.length,
                            });
                        }

                        const pathToChildNode = [...pathToNode, value];
                        const hierarchyFilters: FileFilter[] = zip<string, string>(
                            take(hierarchy, depth + 1),
                            take(pathToChildNode, depth + 1)
                        ).map((pair) => {
                            const [name, value] = pair as [string, string];
                            if (value === NO_VALUE_NODE) {
                                return new ExcludeFilter(name);
                            }
                            return new FileFilter(name, value);
                        });

                        // Filters are a combination of any user-selected filters and the filters
                        // at a particular path in the hierarchy.
                        //
                        // Remove any user-applied filters for any annotation within the current path.
                        // E.g., if under the path "AICS-12" -> "ZSD-1", and a user has applied the filters FileFilter("Channel Type", "Raw 488nm")
                        // and FileFilter("Cell Line", "AICS-33"), we do not want to include the latter in the query for this FileList.
                        const hierarchyAnnotationNames = new Set(hierarchy);
                        const userAppliedFilters = selectedFileFilters.filter(
                            (f) => !hierarchyAnnotationNames.has(f.name)
                        );
                        const filters = uniqWith(
                            [...hierarchyFilters, ...userAppliedFilters],
                            (a, b) => a.equals(b)
                        );

                        const childNodeFileSet = new FileSet({
                            fileService,
                            filters,
                            sort: sortColumn,
                        });

                        const displayValue =
                            value === NO_VALUE_NODE
                                ? `No value ("${hierarchy[depth]}")`
                                : annotationAtDepth?.getDisplayValue(value) || value;

                        return (
                            <DirectoryTreeNode
                                key={`${pathToChildNode.join(":")}|${hierarchy.join(":")}`}
                                ancestorNodes={pathToNode}
                                currentNode={value}
                                displayValue={displayValue}
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
                        dispatch(setError(e as Error, isRoot));
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
        excludeFilters,
        fileService,
        fileSet,
        fuzzyFilters,
        hierarchy,
        includeFilters,
        isRoot,
        isLeaf,
        selectedFileFilters,
        shouldShowNullGroups,
        sortColumn,
        sortOrder,
    ]);

    return {
        isLeaf,
        state,
    };
};

export default useDirectoryHierarchy;
