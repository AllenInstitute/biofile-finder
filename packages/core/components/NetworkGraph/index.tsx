import React from "react";
import { ReactFlow, useNodesState, useEdgesState, Node, Edge } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

import "@xyflow/react/dist/style.css";
import styles from "./NetworkGraph.module.css";

import CustomEdge from "./CustomEdge";
// import CustomNode from './CustomNode';

interface NetworkGraphProps {
    initialNodes: Node[];
    initialEdges: Edge[];
}

const edgeTypes = {
    "custom-edge": CustomEdge,
};

const nodeTypes = {
    // "custom-node": CustomNode,
};

// Currently arbitrary placeholder values
const NODE_WIDTH = 180;
const NODE_HEIGHT = 36;

export default function NetworkGraph(props: NetworkGraphProps) {
    const { initialNodes, initialEdges } = props;

    const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

    const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
        const isHorizontal = direction === "LR";
        dagreGraph.setGraph({ rankdir: direction });

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const newNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            const newNode = {
                ...node,
                targetPosition: isHorizontal ? "left" : "top",
                sourcePosition: isHorizontal ? "right" : "bottom",
                // Shift the dagre node position (anchor=center center) to the top left
                // so it matches the React Flow node anchor point (top left).
                position: {
                    x: nodeWithPosition.x - NODE_WIDTH / 2,
                    y: nodeWithPosition.y - NODE_HEIGHT / 2,
                },
            };

            return newNode as Node;
        });

        return { nodes: newNodes, edges };
    };

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
    );
    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    // Watch for changes to the component props
    React.useEffect(() => {
        onLayout();
    }, [initialNodes, initialEdges]);

    // Re-generate the layout of the nodes and edges if they change
    const onLayout = React.useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );

        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [initialNodes, initialEdges]);

    return (
        <div className={styles.reactFlowContainer}>
            <ReactFlow
                colorMode="dark"
                nodes={nodes}
                edges={edges}
                edgeTypes={edgeTypes}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            />
        </div>
    );
}
