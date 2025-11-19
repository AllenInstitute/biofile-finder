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
        console.log('generate');
        async function generate() {
            await graphGenerator.generate(props.origin);
            setGraph(graphGenerator.get());
        }
        generate();
    }, [graphGenerator, origin]);

    return (
        <div className={props.className}>
            <ReactFlow
                // TODO: Use the below thing to focus in on the node selected
                autoPanOnNodeFocus
                proOptions={{ hideAttribution: true }}
                onlyRenderVisibleElements
                reconnectRadius={0}
                className={styles.graph}
                fitView
                colorMode="dark"
                edgesFocusable={false}
                edgesReconnectable={false}
                elementsSelectable={false}
                nodesDraggable={true}
                nodesConnectable={false}
                nodesFocusable={false}
                nodes={graph.nodes}
                edges={graph.edges}
                edgeTypes={EDGE_TYPES}
                nodeTypes={NODE_TYPES}
            />
        </div>
    );
}
