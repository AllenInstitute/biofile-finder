import { SpinnerSize } from "@fluentui/react";
import { Edge, ReactFlow, EdgeTypes, useNodesState, useEdgesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import classNames from "classnames";
import React from "react";

import DefaultEdge from "./Edges/DefaultEdge";
import FileNode from "./Nodes/FileNode";
import MetadataNode from "./Nodes/MetadataNode";
import LoadingIcon from "../Icons/LoadingIcon";
import FileDetail from "../../entity/FileDetail";
import Graph, {
    AnnotationEdge,
    EdgeType,
    NodeType,
    FileNode as FileNodeType,
    MetadataNode as MetadataNodeType,
} from "../../entity/Graph";

import styles from "./NetworkGraph.module.css";

interface NetworkGraphProps {
    className?: string;
    graph: Graph;
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
    // These are used by xyflow to redraw the nodes/edges on drag
    const [nodes, setNodes, onNodesChange] = useNodesState<FileNodeType | MetadataNodeType>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<AnnotationEdge>>([]);

    React.useEffect(() => {
        setNodes(props.graph.nodes);
        setEdges(props.graph.edges);
    }, [props.graph.nodes, props.graph.edges]);

    if (props.graph.isLoading) {
        return (
            <div className={classNames(styles.loadingIconContainer, props.className)}>
                <LoadingIcon size={SpinnerSize.large} />
            </div>
        );
    }

    return (
        <div className={props.className}>
            <ReactFlow
                fitView
                onlyRenderVisibleElements
                className={styles.graph}
                edgesFocusable={false}
                nodesConnectable={false}
                nodesFocusable={false}
                elementsSelectable={false}
                edgesReconnectable={false}
                colorMode="dark"
                nodes={nodes}
                edges={edges}
                edgeTypes={EDGE_TYPES}
                nodeTypes={NODE_TYPES}
                proOptions={{ hideAttribution: true }}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
            />
        </div>
    );
}
