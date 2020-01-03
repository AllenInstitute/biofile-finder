import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";
import { VariableSizeList } from "react-window";

import DirectoryTreeNode from "./DirectoryTreeNode";
import * as fileListSelectors from "./selectors";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";

interface FileListProps {
    className?: string;
}

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped.
 */
export default function DirectoryTree(props: FileListProps) {
    const [ref, containerHeight] = useLayoutMeasurements<HTMLDivElement>(); // eslint-disable-line @typescript-eslint/no-unused-vars

    const directoryTree = useSelector(fileListSelectors.getDirectoryTree);

    const listRef = React.useRef<VariableSizeList>(null);
    const [collapsed, toggleCollapsed] = React.useState(() => new Map<number, boolean>());

    React.useEffect(() => {
        toggleCollapsed((prevCollapsed) => {
            if (prevCollapsed.size > 0) {
                return new Map<number, boolean>();
            }

            return prevCollapsed;
        });
        if (listRef.current) {
            listRef.current.resetAfterIndex(0, false);
        }
    }, [directoryTree, listRef]);

    const toggleCollapsedState = React.useCallback(
        (index) => {
            toggleCollapsed((prevCollapsedState) => {
                const nextCollapsedState = new Map(prevCollapsedState.entries());
                const fileSetTreeNode = directoryTree.get(index);

                // defensive condition, included only for the type checker--should never hit
                if (!fileSetTreeNode) {
                    return prevCollapsedState;
                }

                let prevState = nextCollapsedState.get(index);
                // if collapsed state has not yet been explicitly set at this index, it should be treated as:
                // true, in the case that it is a leaf node (renders a set of files)
                // false, in the case that is not a leaf node
                if (prevState === undefined) {
                    prevState = fileSetTreeNode.isLeaf;
                }

                nextCollapsedState.set(index, !prevState);
                return nextCollapsedState;
            });
            if (listRef.current) {
                listRef.current.resetAfterIndex(index, true);
            }
        },
        [listRef, directoryTree]
    );

    const isCollapsed = React.useCallback(
        (index: number | null): boolean => {
            // `index` will be null when checking for ancestral collapsed state. That is, FileSetTreeNode::parent will eventually be `null`.
            if (index === null) {
                return false;
            }

            const fileSetTreeNode = directoryTree.get(index);

            // defensive condition, included only for the type checker--should never hit
            if (!fileSetTreeNode) {
                return false;
            }

            // never collapse root dir
            if (fileSetTreeNode.isRoot) {
                return false;
            }

            // if parent (or grand-, or great-grand parent) is collapsed, this node should be collapsed as well
            if (isCollapsed(fileSetTreeNode.parent)) {
                return true;
            }

            // if user has explicitly collapsed this node, defer to user's selection
            const isCollapsedAtIndex = collapsed.get(index);
            if (isCollapsedAtIndex !== undefined) {
                // unfortunately Map::has does not act as a type guard so need to do an explicit undefined check
                return isCollapsedAtIndex;
            }

            // by default, collapse the tree's leaves (sets of files)
            if (fileSetTreeNode.isLeaf) {
                return true;
            }

            // otherwise, the trees branches default to open
            return false;
        },
        [collapsed, directoryTree]
    );

    return (
        <div className={classNames(props.className)} ref={ref}>
            <VariableSizeList
                ref={listRef}
                height={containerHeight}
                itemCount={directoryTree.size}
                itemData={{
                    directoryTree,
                    isCollapsed,
                    onClick: toggleCollapsedState,
                }}
                itemSize={(index) => {
                    const node = directoryTree.get(index);

                    // defensive condition, included only for the type checker--should never hit
                    if (!node) {
                        return 0;
                    }

                    // root dir should take up full height
                    if (node.isRoot) {
                        return containerHeight;
                    }

                    if (isCollapsed(node.parent)) {
                        return 0;
                    }

                    // if leaf of tree and expanded, expand to some constant height
                    if (node.isLeaf && !isCollapsed(index)) {
                        return 300; // TODO
                    }

                    // by default, render to some arbitrary constant height
                    return 35; // TODO
                }}
                width="100%"
            >
                {DirectoryTreeNode}
            </VariableSizeList>
        </div>
    );
}
