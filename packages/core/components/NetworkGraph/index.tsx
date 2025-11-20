import { SpinnerSize } from "@fluentui/react";
import { Edge, ReactFlow, EdgeTypes, useNodesState, useEdgesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import classNames from "classnames";
import React from "react";
import { useSelector } from "react-redux";

import DefaultEdge from "./Edges/DefaultEdge";
import FileNode from "./Nodes/FileNode";
import MetadataNode from "./Nodes/MetadataNode";
import LoadingIcon from "../Icons/LoadingIcon";
import FileDetail from "../../entity/FileDetail";
import { AnnotationEdge, EdgeType, NodeType, ProvenanceNode } from "../../entity/GraphGenerator";
import { interaction } from "../../state";

import styles from "./NetworkGraph.module.css";


interface NetworkGraphProps {
    className?: string;
    origin: FileDetail;
    // Used by parent to force network graph to refresh
    // which would otherwise only happen on origin change
    refreshKey?: string;
}

const EDGE_TYPES: EdgeTypes = {
    [EdgeType.DEFAULT]: DefaultEdge,
};

const NODE_TYPES = {
    [NodeType.FILE]: FileNode,
    [NodeType.METADATA]: MetadataNode,
};

export default function NetworkGraph(props: NetworkGraphProps) {
    const [isLoading, setIsLoading] = React.useState(true);
    const graphGenerator = useSelector(interaction.selectors.getGraphGenerator);

    // These are used by xyflow to redraw the nodes/edges on drag
    const [nodes, setNodes, onNodesChange] = useNodesState<ProvenanceNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<AnnotationEdge>>([]);

    React.useEffect(() => {
        setIsLoading(true);
        graphGenerator.generate(props.origin)
            .then(() => {
                const graph = graphGenerator.get();
                setNodes(graph.nodes);
                setEdges(graph.edges);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [graphGenerator, origin, setNodes, setEdges, setIsLoading, props.refreshKey]);

    if (isLoading) {
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
