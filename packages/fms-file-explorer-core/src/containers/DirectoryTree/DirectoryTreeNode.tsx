import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DirectoryTreeNodeHeader from "./DirectoryTreeNodeHeader";
import useDirectoryHierarchy from "./useDirectoryHierarchy";
import { selection } from "../../state";
import FileFolder from "../../entity/FileFolder";

const styles = require("./DirectoryTreeNode.module.css");

interface DirectoryTreeNodeProps {
    ancestorNodes: string[];
    currentNode: string; // the "directory name" to present
    displayValue: string;
}

const ICON_SIZE = 15; // in px; both width and height

/**
 * An individual node (e.g., a "directory") in the hierarchical list of annotation values.
 * Will either render more DirectoryTreeNodes, or, if at the bottom of the annotation hierarchy,
 * will render a FileList showing the set of files that match the filters at this path in the hierarchy.
 */
export default function DirectoryTreeNode(props: DirectoryTreeNodeProps) {
    const { ancestorNodes, currentNode, displayValue } = props;
    const dispatch = useDispatch();
    const openFileFolders = useSelector(selection.selectors.getOpenFileFolders);
    const fileFolderPath = [...ancestorNodes, currentNode];
    const fileFolder = new FileFolder(fileFolderPath);
    const collapsed = !openFileFolders.find((f) => f.equals(fileFolder));
    const {
        isLeaf,
        state: { content, error, isLoading },
    } = useDirectoryHierarchy({ ancestorNodes, currentNode, collapsed });
    return (
        <li
            className={styles.treeNodeContainer}
            role="treeitem"
            aria-expanded={collapsed ? "false" : "true"}
            aria-level={ancestorNodes.length + 1} // aria-level is 1-indexed
        >
            <DirectoryTreeNodeHeader
                collapsed={collapsed || Boolean(error)}
                error={error}
                loading={isLoading}
                title={displayValue}
                fileFolderPath={fileFolderPath}
                onClick={() => dispatch(selection.actions.toggleFileFolderCollapse(fileFolder))}
            />
            <ul
                className={classNames(styles.children, {
                    [styles.collapsed]: collapsed || Boolean(error),
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
