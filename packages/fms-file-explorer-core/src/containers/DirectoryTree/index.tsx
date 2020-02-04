import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";
import { VariableSizeList } from "react-window";

import DirectoryTreeNode from "./DirectoryTreeNode";
import * as directoryTreeSelectors from "./selectors";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";
import useDirectoryTree from "./useDirectoryTree";

interface FileListProps {
    className?: string;
}

const COLLAPSED_DIRECTORY_TREE_NODE_HEIGHT = 0; // in px
const DEFAULT_DIRECTORY_TREE_NODE_HEIGHT = 35; // in px
const EXPANDED_FILE_LIST_HEIGHT = 300; // in px

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped. E.g.:
 *
 * [collapsible folder] ScientistA
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 * [collapsible folder] ScientistB
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 */
export default function DirectoryTree(props: FileListProps) {
    const fileFilters = useSelector(directoryTreeSelectors.getFileFilters);
    const fileService = useSelector(directoryTreeSelectors.getFileService);
    const { directoryTree, onExpandCollapse } = useDirectoryTree(fileFilters, fileService);
    const [ref, containerHeight] = useLayoutMeasurements<HTMLDivElement>();
    const listRef = React.useRef<VariableSizeList>(null);

    React.useEffect(() => {
        if (listRef.current) {
            listRef.current.resetAfterIndex(0, true);
        }
    }, [listRef, containerHeight, directoryTree]);

    return (
        <div className={classNames(props.className)} ref={ref}>
            <VariableSizeList
                ref={listRef}
                height={containerHeight}
                itemCount={directoryTree.size}
                itemData={{
                    directoryTree,
                    onClick: onExpandCollapse,
                }}
                itemKey={(index, data) => {
                    const { directoryTree } = data;
                    const treeNode = directoryTree.get(index);
                    if (!treeNode) {
                        return index;
                    }

                    const { fileSet } = treeNode;
                    return fileSet.toQueryString();
                }}
                itemSize={(index) => {
                    const node = directoryTree.get(index);

                    // defensive condition, included only for the type checker--should never hit
                    if (!node) {
                        return COLLAPSED_DIRECTORY_TREE_NODE_HEIGHT;
                    }

                    // root dir should take up full height
                    if (node.isRoot) {
                        return containerHeight;
                    }

                    // if leaf of tree and expanded, expand to some constant height
                    if (node.isLeaf && !node.isCollapsed) {
                        return EXPANDED_FILE_LIST_HEIGHT;
                    }

                    // by default, render to some arbitrary constant height
                    return DEFAULT_DIRECTORY_TREE_NODE_HEIGHT;
                }}
                width="100%"
            >
                {DirectoryTreeNode}
            </VariableSizeList>
        </div>
    );
}
