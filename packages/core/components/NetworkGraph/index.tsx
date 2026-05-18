import { DefaultButton, Icon, SpinnerSize } from "@fluentui/react";
import {
    Edge,
    ReactFlow,
    EdgeTypes,
    useNodesState,
    useEdgesState,
    Controls,
    useReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import classNames from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import DefaultEdge from "./Edges/DefaultEdge";
import FileNode from "./Nodes/FileNode";
import MetadataNode from "./Nodes/MetadataNode";
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
import buttonStyles from "../Buttons/TertiaryButton.module.css";

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
export default function NetworkGraph(props: NetworkGraphProps) {
    const isLoading = useSelector(interaction.selectors.isGraphLoading);
    const provenanceSource = useSelector(selection.selectors.getSelectedSourceProvenance);
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

    // The ReactFlow component can only access state (useReactFlow) if it's the child of a ReactFlowProvider
    // See https://reactflow.dev/learn/troubleshooting/common-errors#001
    function ReactFlowComponent() {
        const dispatch = useDispatch();
        const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<AnnotationEdge>>([]);
        const [nodes, setNodes, onNodesChange] = useNodesState<FileNodeType | MetadataNodeType>([]);
        const graph = useSelector(interaction.selectors.getGraph);
        const refreshKey = useSelector(interaction.selectors.getGraphRefreshKey);
        // Unfortunately we have to have some notion of state at a high level for control from the components
        // and at the dagre level for when the user does a drag action causing this duplication of efforts
        React.useEffect(() => {
            let cancel = false;
            if (!cancel) {
                setEdges(graph.edges);
                setNodes(graph.nodes);
            }
            return function cleanup() {
                cancel = true;
            };
        }, [graph, setEdges, setNodes, refreshKey]);
        const { fitView } = useReactFlow();
        const onClickReset = () => {
            graph.resetLayout(); // return to default layout if any
            fitView(); // reset zoom
            dispatch(interaction.actions.refreshGraph());
        };
        return (
            <>
                <DefaultButton
                    className={classNames(buttonStyles.button, styles.refreshButton)}
                    title="Reset graph to initial state"
                    onClick={onClickReset}
                >
                    <Icon iconName="Refresh" />
                    Reset view
                </DefaultButton>
                <ReactFlow
                    fitView
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
            </>
        );
    }

    // The wrapped ReactFlow component
    return (
        <div className={classNames(props.className, styles.reactFlow)}>
            <ReactFlowProvider>
                <ReactFlowComponent />
            </ReactFlowProvider>
        </div>
    );
}
