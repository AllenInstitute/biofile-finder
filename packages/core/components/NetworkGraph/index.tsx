import React from "react";
import { ReactFlow, useNodesState, useEdgesState, Node, Edge } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

import "@xyflow/react/dist/style.css";

import CustomEdge from "./CustomEdge";
// import FileNode from './FileNode';

interface NetworkGraphProps {
    initialNodes: Node[];
    initialEdges: Edge[];
}

const edgeTypes = {
    "custom-edge": CustomEdge,
};

const nodeTypes = {
    // 'file-node': FileNode,
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
    const [nodes, _setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, _setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    return (
        <div style={{ width: "100%", height: "500px" }}>
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
