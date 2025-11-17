import React from "react";
import { ReactFlow, EdgeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import useGraph from "./useGraph";
import DefaultEdge from "./Edges/DefaultEdge";
import FileNode from "./Nodes/FileNode";
import MetadataNode from "./Nodes/MetadataNode";
import FileDetail from "../../entity/FileDetail";
import { EdgeType, NodeType } from "../../entity/GraphGenerator";

import styles from "./NetworkGraph.module.css";


interface NetworkGraphProps {
    origin: FileDetail;
}

const EDGE_TYPES: EdgeTypes = {
    [EdgeType.DEFAULT]: DefaultEdge,
};

const NODE_TYPES = {
    [NodeType.FILE]: FileNode,
    [NodeType.METADATA]: MetadataNode,
};

export default function NetworkGraph(props: NetworkGraphProps) {
    // TODO: Add request more button feature
    const { graph: { nodes, edges  }, onRequestMoreCallback } = useGraph(props.origin);

    return (
        <div className={styles.reactFlowContainer}>
            <ReactFlow
                fitView
                colorMode="dark"
                edgesFocusable={false}
                edgesReconnectable={false}
                elementsSelectable={false}
                nodesConnectable={false}
                nodesFocusable={false}
                nodes={nodes}
                edges={edges}
                edgeTypes={EDGE_TYPES}
                nodeTypes={NODE_TYPES}
            />
        </div>
    );
}
