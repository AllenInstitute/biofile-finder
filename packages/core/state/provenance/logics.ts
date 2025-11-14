import { Edge } from "@xyflow/react";
import { createLogic } from "redux-logic";

import {
    CONSTRUCT_PROVENANCE_GRAPH,
    ConstructProvenanceGraph,
    setGraphEdges,
    setGraphNodes,
} from "./actions";
import { EdgeDefinition, ProvenanceNode } from "./reducer";
import { ReduxLogicDeps, selection } from "../";
import interaction from "../interaction";
import FileDetail from "../../entity/FileDetail";
import FileSet from "../../entity/FileSet";
import FileFilter from "../../entity/FileFilter";
import { FmsFileAnnotation } from "../../services/FileService";

/**
 * Interceptor responsible for responding to CONSTRUCT_PROVENANCE_GRAPH actions
 * by processing edge definitions into nodes & edges that are stored in state
 */
const constructProvenanceLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: file } = deps.action as ConstructProvenanceGraph;

        const fileService = interaction.selectors.getFileService(deps.getState());
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );
        const selectedDataSources = selection.selectors.getSelectedDataSources(deps.getState());

        const edgeDefinitions = await databaseService.fetchProvenanceDefinitions(
            selectedDataSources.map((source) => source.name)
        );

        const fileGetter = async (id: string): Promise<FileDetail> => {
            const files = await fileService.getFiles({
                from: 0,
                limit: 1,
                fileSet: new FileSet({ fileService, filters: [new FileFilter("File ID", id)] })
            });
            if (files.length !== 1) {
                // TODO: Improve here
                throw Error("Ugh idk man why not 1");
            }
            return files[0];
        }

        const { nodeIdToNodeMap, edgeIdToEdgeMap } = await addFileToGraph(file, fileGetter, {}, {}, edgeDefinitions, 0, true);
        console.log("nodeIdToNodeMap", nodeIdToNodeMap)
        console.log("edgeIdToEdgeMap", edgeIdToEdgeMap)

        dispatch(setGraphEdges(Object.values(edgeIdToEdgeMap)));
        dispatch(setGraphNodes(Object.values(nodeIdToNodeMap)));
        done();
    },
    type: CONSTRUCT_PROVENANCE_GRAPH,
});


/**
 * TODO
 * @param file 
 * @returns 
 */
function createFileNode(file: FileDetail, isSelected = false): ProvenanceNode {
    return {
        id: file.id, // TODO: use row id..?
        data: {
            file,
            isSelected,
        },
        position: { x: 0, y: 0 },  // TODO: What is this for..? isn't this auto-calculated on the fly?
        type: "file"
    };
}


/**
 * TODO
 * @param annotation 
 * @returns 
 */
function createNonFileNode(annotation: FmsFileAnnotation): ProvenanceNode {
    return {
        id: `${annotation.name}: ${annotation.values.join(", ")}`,
        data: {
            annotation,
            isSelected: false,
        },
        position: { x: 0, y: 0 },
        type: "non-file"
    };
}

function createEdge(edgeInfo: { label: string, parentId: string, childId: string }): Edge {
    const { label, parentId, childId } = edgeInfo;
    return {
        id: `${parentId}-${childId}`,
        data: { label, },
        markerEnd: { type: "arrow" }, // TODO: Is this even used?
        source: parentId,
        target: childId,
        type: "custom-edge",
    }
}



/**
 * Recursive function that adds the given file to the node graph
 * then finds any relevant edges to connect
 * 
 * TODO: improve description
 */
const addFileToGraph = async (
    file: FileDetail,
    fileGetter: (id: string) => Promise<FileDetail>,
    edgeIdToEdgeMap: { [id: string]: Edge },
    nodeIdToNodeMap: { [id: string]: ProvenanceNode },
    edgeDefinitions: EdgeDefinition[],
    relationshipDistance: number,
    isSelected = false,
    maxRelationshipDistance = 10,
) => {
    // Add the node for this file
    const thisNode = createFileNode(file, isSelected);

    // Base-case: Stop building graph after X recursion levels
    // to avoid getting to large of a graph on first go
    // or if this graph has already been investigated
    // TODO: Probably want to have a direction sense here because
    //       we might want all the way to the primary ancestor
    //       and then like just the children and no siblings for example
    if (relationshipDistance > maxRelationshipDistance || thisNode.id in nodeIdToNodeMap) {
        return { edgeIdToEdgeMap, nodeIdToNodeMap };
    }

    // Add this node to mapping
    nodeIdToNodeMap[thisNode.id] = thisNode;

    // TODO: perhaps this should only stop when it hits a file and never
    // when it is an entity
    await Promise.all(edgeDefinitions.map(async (edgeDefinition) => {
        const [parentNode, childNode] = await Promise.all(
            [edgeDefinition.parent, edgeDefinition.child]
            .map(async (edgeNode) => {
                // The node might just be the current node!
                const isEdgeNodeThisNode = edgeNode.name === "File ID"; // TODO: Expand this... should there be type of "ID" or "Self" or smthn..?
                if (isEdgeNodeThisNode) {
                    return thisNode;
                }

                // Annotation may not exist on this file, this could happen
                // for some files for which there shouldn't be an edge connecting
                // to this file for that annotation
                const annotation = file.getAnnotation(edgeNode.name);
                if (annotation) {
                    // The Node could be a file such as when an annotation points to another
                    // file via an annotation; an example of this is the "Input File" metadata key
                    // we have seen users use to note the ID of a file used as input to the segmentation
                    // model that generated the current node ("thisNode")
                    const isNodeAFile = edgeNode.type === "file";
                    if (isNodeAFile) {
                        const nodeFileId = annotation.values[0] as string; // TODO: Not friendly to arrays :/
                        // Avoid re-requesting the file
                        if (nodeFileId in nodeIdToNodeMap) {
                            return nodeIdToNodeMap[nodeFileId];
                        }
                        const nodeFile = await fileGetter(nodeFileId);
                        return createFileNode(nodeFile);
                    } else {
                        return createNonFileNode(annotation);
                    }
                }
            })
        );

        // Only generate the edge if the parent and child node both exist
        // (otherwise what is there even to connect)
        if (parentNode && childNode) {
            // Add parent & child nodes to graph
            await Promise.all([childNode, parentNode].map(async (node) => {
                const isNodeInMapAlready = node.id in nodeIdToNodeMap;
                if (!isNodeInMapAlready) {
                    if (!!node.data.file) {
                        // TODO: wait to grab the actual file until here
                        // get more graph! TODO: Only if parent????
                        const otherFileGraph = await addFileToGraph(node.data.file, fileGetter, edgeIdToEdgeMap, nodeIdToNodeMap, edgeDefinitions, relationshipDistance + 1);
                        Object.assign(nodeIdToNodeMap, otherFileGraph.nodeIdToNodeMap);
                        Object.assign(edgeIdToEdgeMap, otherFileGraph.edgeIdToEdgeMap);
                    } else {
                        nodeIdToNodeMap[node.id] = node;
                    }
                }
            }));

            // Add edge to graph
            const edge = createEdge({
                label: edgeDefinition.relationship,
                parentId: parentNode.id,
                childId: childNode.id,
            });
            edgeIdToEdgeMap[edge.id] = edge;
        }
    }));

    return { nodeIdToNodeMap, edgeIdToEdgeMap };
}


export default [constructProvenanceLogic];
