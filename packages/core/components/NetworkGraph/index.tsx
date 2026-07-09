import { SpinnerSize } from "@fluentui/react";
import {
    Edge,
    ReactFlow,
    EdgeTypes,
    useNodesState,
    useEdgesState,
    Controls,
    useReactFlow,
    useNodesInitialized,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import classNames from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import DefaultEdge from "./Edges/DefaultEdge";
import FileNode from "./Nodes/FileNode";
import MetadataNode from "./Nodes/MetadataNode";
import { TertiaryButton } from "../Buttons";
import LoadingIcon from "../Icons/LoadingIcon";
import {
    AnnotationEdge,
    EdgeType,
    NodeType,
    FileNode as FileNodeType,
    MetadataNode as MetadataNodeType,
} from "../../entity/Graph";
import { interaction, selection } from "../../state";

import styles from "./NetworkGraph.module.css";

interface NetworkGraphProps {
    className?: string;
}

const EDGE_TYPES: EdgeTypes = {
    [EdgeType.DEFAULT]: DefaultEdge,
};

const NODE_TYPES = {
    [NodeType.FILE]: FileNode,
    [NodeType.METADATA]: MetadataNode,
};

/**
 * Component for rendering a graph at the given origin
 */
function NetworkGraph(props: NetworkGraphProps) {
    const dispatch = useDispatch();
    const graph = useSelector(interaction.selectors.getGraph);
    const isLoading = useSelector(interaction.selectors.isGraphLoading);
    const refreshKey = useSelector(interaction.selectors.getGraphRefreshKey);
    const provenanceSource = useSelector(selection.selectors.getSelectedSourceProvenance);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<AnnotationEdge>>([]);
    const [nodes, setNodes, onNodesChange] = useNodesState<FileNodeType | MetadataNodeType>([]);
    const { fitView, setCenter, getZoom } = useReactFlow();
    const nodesInitialized = useNodesInitialized();

    // Unfortunately we have to have some notion of state at a high level for control from the components
    // and at the dagre level for when the user does a drag action causing this duplication of efforts
    React.useEffect(() => {
        setEdges(graph.edges);
        setNodes(graph.nodes);
    }, [graph, setEdges, setNodes, refreshKey]);

    // Once the graph has finished building, pan so the origin (selected) node
    // is centered in the viewport. The origin is the sole node flagged as
    // selected (see Graph.originate -> createFileNode(origin, true)).
    const lastCenteredRefreshKeyRef = React.useRef<string | undefined>(undefined);
    React.useEffect(() => {
        if (isLoading || !nodesInitialized) return;
        if (lastCenteredRefreshKeyRef.current === refreshKey) return;

        const originNode = nodes.find((node) => node.data.isSelected);
        if (!originNode) return;

        lastCenteredRefreshKeyRef.current = refreshKey;
        const centerX = originNode.position.x + (originNode.width ?? 0) / 2;
        const centerY = originNode.position.y + (originNode.height ?? 0) / 2;
        setCenter(centerX, centerY, { zoom: getZoom(), duration: 800 });
    }, [isLoading, nodesInitialized, nodes, refreshKey, setCenter, getZoom]);

    // The option to open this graph shouldn't even appear when a
    // source isn't available so this shouldn't ever happen
    if (!provenanceSource) {
        return null;
    }

    if (isLoading) {
        return (
            <div className={classNames(styles.simpleContainer, props.className)}>
                <LoadingIcon size={SpinnerSize.large} />
            </div>
        );
    }

    const onClickReset = () => {
        graph.resetLayout(); // return to default layout if any
        fitView(); // reset zoom
        dispatch(interaction.actions.refreshGraph());
    };

    return (
        <div className={props.className}>
            <TertiaryButton
                className={styles.resetButton}
                iconName="Refresh"
                text="Reset view"
                title="Reset graph to initial state"
                onClick={onClickReset}
            />
            <ReactFlow
                onlyRenderVisibleElements
                className={styles.graph}
                edgesFocusable={false}
                nodesDraggable={false}
                nodesConnectable={false}
                nodesFocusable={false}
                elementsSelectable={true}
                edgesReconnectable={false}
                colorMode="dark"
                nodes={nodes}
                edges={edges}
                edgeTypes={EDGE_TYPES}
                nodeTypes={NODE_TYPES}
                proOptions={{ hideAttribution: true }}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
            >
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

// The ReactFlow component can only access state (useReactFlow) if it's the child of a ReactFlowProvider
// See https://reactflow.dev/learn/troubleshooting/common-errors#001
export default function WrappedNetworkGraph(props: NetworkGraphProps) {
    return (
        <ReactFlowProvider>
            <NetworkGraph {...props} />
        </ReactFlowProvider>
    );
}
