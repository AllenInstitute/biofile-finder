import React from "react";
import dagre from "@dagrejs/dagre";
import { ReactFlow, useNodesState, useEdgesState, Node, Edge, EdgeTypes, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import DefaultEdge from "./Edges/DefaultEdge";
import FileNode from "./Nodes/FileNode";
import MetadataNode from "./Nodes/MetadataNode";
import { EdgeType, NodeType } from "../../entity/GraphGenerator";
import { ProvenanceNode } from "../../state/provenance/reducer";

import styles from "./NetworkGraph.module.css";


interface NetworkGraphProps {
    initialNodes: ProvenanceNode[];
    initialEdges: Edge[];
}

const EDGE_TYPES: EdgeTypes = {
    [EdgeType.DEFAULT]: DefaultEdge,
};

const NODE_TYPES = {
    [NodeType.FILE]: FileNode,
    [NodeType.METADATA]: MetadataNode,
};

// Currently arbitrary placeholder values
const NODE_WIDTH = 180;
const NODE_HEIGHT = 36;

export default function NetworkGraph(props: NetworkGraphProps) {
    const { initialNodes, initialEdges } = props;

    const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

    const getLayoutedElements = (nodes: ProvenanceNode[], edges: Edge[]) => {
        // Graph customization
        // - direction: top to bottom (as opposed to left/right)
        // - (node/rank)sep: distance between individual nodes and between each generation of nodes
        dagreGraph.setGraph({ rankdir: "TB" });

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const positionedNodes = nodes.map((node): Node => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                // targetPosition: Position.Top,
                // sourcePosition: Position.Bottom,
                // Shift the dagre node position (anchor=center center) to the top left
                // so it matches the React Flow node anchor point (top left).
                position: {
                    x: nodeWithPosition.x - NODE_WIDTH / 2,
                    y: nodeWithPosition.y - NODE_HEIGHT / 2,
                },
            };
        });

        return { nodes: positionedNodes, edges };
    };

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
    );
    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    // Re-generate the layout of the nodes and edges if they change
    // To do: This and below is an improper use of callback logic w/ dependencies
    const onLayout = React.useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );

        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    // Watch for changes to the component props and re-render graph
    React.useEffect(() => {
        onLayout();
    }, [initialNodes, initialEdges]);

    return (
        <div className={styles.reactFlowContainer}>
            <ReactFlow
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
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            />
        </div>
    );
}
