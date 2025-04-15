import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DirectoryTreeNodeHeader from "./DirectoryTreeNodeHeader";
import useDirectoryHierarchy from "./useDirectoryHierarchy";
import { selection } from "../../state";
import FileFolder from "../../entity/FileFolder";
import FileSet from "../../entity/FileSet";

import styles from "./DirectoryTreeNode.module.css";

interface DirectoryTreeNodeProps {
    ancestorNodes: string[];
    currentNode: string; // the "directory name" to present
    displayValue: string;
    fileSet: FileSet;
    sortOrder: number;
}

const ICON_SIZE = 15; // in px; both width and height

/**
 * An individual node (e.g., a "directory") in the hierarchical list of annotation values.
 * Will either render more DirectoryTreeNodes, or, if at the bottom of the annotation hierarchy,
 * will render a FileList showing the set of files that match the filters at this path in the hierarchy.
 */
export default function DirectoryTreeNode(props: DirectoryTreeNodeProps) {
    const { ancestorNodes, currentNode, displayValue, fileSet, sortOrder } = props;
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const openFileFolders = useSelector(selection.selectors.getOpenFileFolders);

    const fileFolderPath = [...ancestorNodes, currentNode];
    const fileFolder = new FileFolder(fileFolderPath);
    const collapsed = !openFileFolders.find((f) => f.equals(fileFolder));

    // Is a file within this folder--either directly underneath or otherwise as a descendent--
    // shown in the file details pane?
    const hasFocus = React.useMemo(() => {
        if (collapsed) {
            // If node is collapsed, ask the broad question, "Is the file selection on view in the
            // details pane underneath this node, at any level?"
            return fileSelection.isFocused(fileSet.filters);
        }

        // Otherwise, ask the narrower question, "Is the file selection on view in the details pane
        // _directly_ underneath this folder, as a child?"
        return fileSelection.isFocused(fileSet);
    }, [fileSelection, fileSet, collapsed]);

    const {
        isLeaf,
        state: { content, error, isLoading },
    } = useDirectoryHierarchy({
        ancestorNodes,
        currentNode,
        collapsed,
        fileSet,
        sortOrder,
    });

    // This hook is responsible for ensuring that if the details pane is currently showing a file row
    // within this node, this node is visible.
    const node = React.useRef<HTMLLIElement>(null);
    React.useEffect(() => {
        if (node.current && hasFocus) {
            node.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [hasFocus]);

    return (
        <li
            className={styles.treeNodeContainer}
            ref={node}
            role="treeitem"
            aria-expanded={collapsed ? "false" : "true"}
            aria-level={ancestorNodes.length + 1} // aria-level is 1-indexed
        >
            <DirectoryTreeNodeHeader
                collapsed={collapsed}
                error={error}
                fileSet={fileSet}
                isLeaf={isLeaf}
                isFocused={collapsed && hasFocus}
                loading={isLoading}
                onClick={() => dispatch(selection.actions.toggleFileFolderCollapse(fileFolder))}
                title={displayValue}
            />
            <ul
                className={classNames(styles.children, {
                    [styles.collapsed]: collapsed,
                    [styles.fileList]: isLeaf,
                })}
                style={{ paddingLeft: `${ICON_SIZE + 8}px` }}
                role="group"
            >
                {!collapsed && content}
            </ul>
        </li>
    );
}
