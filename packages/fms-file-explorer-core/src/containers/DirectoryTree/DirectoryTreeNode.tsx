import * as classNames from "classnames";
import * as React from "react";

import DirectoryTreeNodeHeader from "./DirectoryTreeNodeHeader";
import { toggleCollapse } from "./directory-hierarchy-state";
import useDirectoryHierarchy from "./useDirectoryHierarchy";

const styles = require("./DirectoryTreeNode.module.css");

interface DirectoryTreeNodeProps {
    ancestorNodes: string[];
    currentNode: string; // the "directory name" to present
    displayValue: string;
    style?: React.CSSProperties;
}

const ICON_SIZE = 15; // in px; both width and height

/**
 * An individual node (e.g., a "directory") in the hierarchical list of annotation values.
 * Will either render more DirectoryTreeNodes, or, if at the bottom of the annotation hierarchy,
 * will render a FileList showing the set of files that match the filters at this path in the hierarchy.
 */
export default function DirectoryTreeNode(props: DirectoryTreeNodeProps) {
    const { ancestorNodes, currentNode, displayValue, style } = props;
    const {
        isLeaf,
        state: { collapsed, content, error, isLoading },
        dispatch,
    } = useDirectoryHierarchy({ ancestorNodes, currentNode, initialCollapsed: true });

    return (
        <li
            className={styles.treeNodeContainer}
            role="treeitem"
            aria-expanded={collapsed ? "false" : "true"}
            aria-level={ancestorNodes.length + 1} // aria-level is 1-indexed
            style={style}
        >
            <DirectoryTreeNodeHeader
                collapsed={collapsed}
                error={error}
                loading={isLoading}
                title={displayValue}
                onClick={() => dispatch(toggleCollapse())}
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
