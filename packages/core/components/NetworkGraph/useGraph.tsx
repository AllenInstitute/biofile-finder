
import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as React from "react";
import { useSelector } from "react-redux";

import { interaction, selection } from "../../state";
import { getSelectedDataSources } from "../../state/selection/selectors";
import FileDetail from "../../entity/FileDetail";
import GraphGenerator, { ProvenanceNode } from "../../entity/GraphGenerator";


// TODO: Currently arbitrary placeholder values
const NODE_WIDTH = 180;
const NODE_HEIGHT = 36;


/**
 * Position nodes within graph according to edge connections and
 * height/width of individual nodes
 */
function layoutGraph(graph: { nodes: ProvenanceNode[], edges: Edge[]}): { nodes: ProvenanceNode[], edges: Edge[] } {
    const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
            
    // Graph customization
    // - direction: top to bottom (as opposed to left/right)
    // - (node/rank)sep: distance between individual nodes and between each generation of nodes
    dagreGraph.setGraph({ rankdir: "TB" });

    graph.nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    graph.edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const positionedNodes = graph.nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        console.log("node sans position", node);
        console.log("nodeWithPosition", nodeWithPosition);

        // Shift the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        const x = nodeWithPosition.x - nodeWithPosition.width / 2;
        const y = nodeWithPosition.y - nodeWithPosition.height / 2;
        // console.log(y / (nodeWithPosition.rank || 1)) // 43
        // console.log(y / (nodeWithPosition.rank || 1) / nodeWithPosition.height) // 1.2

        return {
            ...node,
            position: { x, y, },
        };
    });

    return { nodes: positionedNodes, edges: graph.edges };
}


/**
 * Hook for generating the graph based off the given origin point
 */
export default (origin: FileDetail) => {
    const fileService = useSelector(interaction.selectors.getFileService);
    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);
    const { databaseService } = useSelector(interaction.selectors.getPlatformDependentServices);

    const [graph, setGraph] = React.useState<{ nodes: ProvenanceNode[], edges: Edge[] }>({} as { nodes: ProvenanceNode[], edges: Edge[] });
    // TODO: figure out callable typing here
    const [onRequestMoreCallback, setOnRequestMoreCallback] = React.useState<any>();

    // Generate the original graph based off the origin
    React.useEffect(() => {
        async function generateGraph() {
            if (origin) {
                const edgeDefinitions = await databaseService.fetchProvenanceDefinitions(
                    selectedDataSources.map((source) => source.name)
                );
        
                const graphGenerator = new GraphGenerator(fileService, edgeDefinitions);
                const getNodes = async (file: FileDetail) => {
                    const graph = await graphGenerator.generate(file);
                    const positionedGraph = layoutGraph(graph);
                    setGraph(positionedGraph);
                }
                await getNodes(origin);
                setOnRequestMoreCallback(getNodes);
            }
        }
        generateGraph();
    }, [
        origin,
        fileService,
        databaseService,
        getSelectedDataSources
    ]);

    return { graph, onRequestMoreCallback };
};
