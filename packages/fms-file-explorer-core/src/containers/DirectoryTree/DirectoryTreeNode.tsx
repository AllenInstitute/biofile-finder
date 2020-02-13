import * as classNames from "classnames";
import * as React from "react";

import DirectoryTreeNodeHeader from "./DirectoryTreeNodeHeader";
import useDirectoryHierarchy from "./useDirectoryHierarchy";

const styles = require("./DirectoryTreeNode.module.css");

interface DirectoryTreeNodeProps {
    ancestorNodes: string[];
    currentNode: string; // the "directory name" to present
}

const ICON_SIZE = 15; // in px; both width and height

export default function DirectoryTreeNode(props: DirectoryTreeNodeProps) {
    const { ancestorNodes, currentNode } = props;
    const { collapsed, content, error, isLeaf, isLoading, setCollapsed } = useDirectoryHierarchy({
        ancestorNodes,
        currentNode,
        initialCollapsed: true,
    });

    return (
        <li
            className={styles.treeNodeContainer}
            role="treeitem"
            aria-expanded={collapsed ? "false" : "true"}
            aria-level={ancestorNodes.length + 1} // aria-level is 1-indexed
        >
            <DirectoryTreeNodeHeader
                collapsed={collapsed}
                error={error}
                loading={isLoading}
                title={currentNode}
                onClick={() => setCollapsed((prevCollapsed) => !prevCollapsed)}
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
