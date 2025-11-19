import { ReactFlow, EdgeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React from "react";
import { useSelector } from "react-redux";

import DefaultEdge from "./Edges/DefaultEdge";
import FileNode from "./Nodes/FileNode";
import MetadataNode from "./Nodes/MetadataNode";
import FileDetail from "../../entity/FileDetail";
import { EdgeType, Graph, NodeType } from "../../entity/GraphGenerator";
import { interaction } from "../../state";

import styles from "./NetworkGraph.module.css";


interface NetworkGraphProps {
    className?: string;
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
    const graphGenerator = useSelector(interaction.selectors.getGraphGenerator);

    const [graph, setGraph] = React.useState<Graph>({ nodes: [], edges: [] });

    React.useEffect(() => {
        graphGenerator.generate(props.origin)
            .then(() => {
                setGraph(graphGenerator.get())
            });
    }, [graphGenerator, origin]);

    return (
        <div className={props.className}>
            <ReactFlow
                className={styles.graph}
                fitView
                nodesDraggable
                elementsSelectable
                autoPanOnNodeFocus
                elevateNodesOnSelect
                onlyRenderVisibleElements
                edgesFocusable={false}
                nodesConnectable={false}
                nodesFocusable={false}
                edgesReconnectable={false}
                colorMode="dark"
                reconnectRadius={0}
                nodes={graph.nodes}
                edges={graph.edges}
                edgeTypes={EDGE_TYPES}
                nodeTypes={NODE_TYPES}
                proOptions={{ hideAttribution: true }}
            />
        </div>
    );
}
