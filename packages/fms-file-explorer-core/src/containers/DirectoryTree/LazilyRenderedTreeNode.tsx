import * as React from "react";

import DirectoryTreeNode from "./DirectoryTreeNode";

interface TreeNode {
    ancestorNodes: string[];
    currentNode: any;
    displayValue: string;
}

interface LazilyRenderedTreeNodeContext {
    nodes: TreeNode[];
}

interface LazilyRenderedTreeNodeProps {
    data: LazilyRenderedTreeNodeContext; // injected by react-window
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

export default function LazilyRenderedTreeNode(props: LazilyRenderedTreeNodeProps) {
    const {
        data: { nodes },
        index,
        style,
    } = props;

    const node = nodes[index];
    return (
        <DirectoryTreeNode
            ancestorNodes={node.ancestorNodes}
            currentNode={node.currentNode}
            displayValue={node.displayValue}
            style={style}
        />
    );
}
