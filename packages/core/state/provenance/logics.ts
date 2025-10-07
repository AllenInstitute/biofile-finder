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
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";

/**
 * Interceptor responsible for responding to CONSTRUCT_PROVENANCE_GRAPH actions
 * by processing edge definitions into nodes & edges that are stored in state
 */
const constructProvenanceLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        const { payload: fileDetails } = deps.action as ConstructProvenanceGraph;
        const fileService = interaction.selectors.getFileService(getState());
        const fileID = fileDetails.id;
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );
        const selectedDataSources = selection.selectors.getSelectedDataSources(deps.getState());

        const edgeDefs = await databaseService.fetchProvenanceDefinitions(
            selectedDataSources.map((source) => source.name)
        );

        // Initialize graph data using selected file
        const { nodeMap, edges, parentMap } = constructGraphForFile(fileDetails, edgeDefs, true);

        // To do: Make this smarter & separate into its own function
        // (or move this whole logic elsewhere?)
        // Construct parent pathways by working backwards up the graph (DFS)
        // using parentMap (adjacency map), starting from the selected file node
        function dfs(start: string, visited = new Set<string>()) {
            const stack = [];
            stack.push([start]);
            visited.add([start].toString());
            const fullPaths = [];
            while (stack.length > 0) {
                const currentPath = stack.pop();
                if (currentPath) {
                    // Get the parent of the last node in the path
                    const parents = parentMap.get(currentPath.slice(-1)[0]);
                    if (!parents || parents.length === 0) {
                        // No more parents, this is a root
                        fullPaths.push(currentPath);
                    } else {
                        parents?.forEach((parent) => {
                            const newPath = [...currentPath, parent];
                            if (!visited.has(newPath.toString())) {
                                stack.push(newPath);
                                visited.add(newPath.toString());
                            }
                            // Start a new path working from current node
                            if (!visited.has([parent].toString())) {
                                stack.push([parent]);
                                visited.add([parent].toString());
                            }
                        });
                    }
                }
            }
            return fullPaths;
        }
        // Sort parent pathways by longest first
        const parentPathways = dfs(`File ID-${fileID}`).sort((a, b) => b.length - a.length);
        // To do: 0=siblings, 1=cousins, etc... how far back to go?
        const testPath = parentPathways[2];

        // Create fileset with filters that match current file selection
        const filters: FileFilter[] = [];
        testPath.forEach((nodeId) => {
            const annotation = nodeMap.get(nodeId)?.data?.annotation;
            if (annotation?.name) {
                filters.push(new FileFilter(annotation.name, annotation.values));
            }
        });
        const fileSet = new FileSet({
            fileService,
            filters,
        });
        // Arbitrary limit to select first 5 files
        const files = await fileSet.fetchFileRange(0, 5);

        // This should maybe happen on demand (e.g., button click) and not on initial graph render?
        files.forEach((relatedFile) => {
            const { nodeMap: newNodeMap, edges: newEdges } = constructGraphForFile(
                relatedFile,
                edgeDefs
            );

            // Merge maps. To do: Pass the map? Or store it in state? so that we avoid
            // generating duplicate nodes and don't have to do the merge logic after
            newNodeMap.forEach((value, key) => {
                if (!nodeMap.has(key)) {
                    nodeMap.set(key, value);
                }
            });
            newEdges.forEach((newEdge) => {
                if (!edges.some((e) => e.id === newEdge.id)) {
                    edges.push(newEdge);
                }
            });
        });

        dispatch(setGraphEdges(edges));
        dispatch(setGraphNodes(Array.from(nodeMap.values())));
        done();
    },
    type: CONSTRUCT_PROVENANCE_GRAPH,
});

// To do: Move elsewhere?
// For a given file, construct nodes and edges based on provenance schema
function constructGraphForFile(
    fileDetails: FileDetail,
    edgeDefs: EdgeDefinition[],
    isSelectedFile?: boolean
) {
    const fileID = fileDetails.id;
    const annotationDetails = fileDetails.details.annotations;
    const edges: Edge[] = [];
    const nodeMap = new Map<string, ProvenanceNode>();
    // Note: This hopefully shouldn't be necessary in the long term, using temporarily to make traversal easier
    const parentMap = new Map<string, string[]>();

    // Add a node for the specific file
    nodeMap.set(`File ID-${fileID}`, {
        id: `File ID-${fileID}`,
        data: { label: `${fileDetails.name}`, isCurrentFile: !!isSelectedFile },
        position: { x: 0, y: 0 },
    });

    edgeDefs.forEach((edge) => {
        const { parent, child, label } = edge;
        const [parentId, childId] = [parent, child].map((entityName) => {
            const annotationInFile = annotationDetails?.find((a) => a.name === entityName);
            if (!annotationInFile) return; // Don't generate node
            const entityId = `${entityName}-${annotationInFile?.values.join(", ")}`;
            if (!nodeMap.has(entityId)) {
                // To do: only generate node if BOTH annotations exist; e.g., outside of .map()
                nodeMap.set(entityId, {
                    id: entityId,
                    data: {
                        label: `${entityName}: ${annotationInFile?.values.join(", ")}`,
                        annotation: annotationInFile,
                    },
                    position: { x: 0, y: 0 },
                });
            }
            return entityId;
        });
        // If we weren't able to generate an ID, the annotation didn't exist in the file
        // To do: Warn user that couldn't generate these nodes/edges?
        if (!parentId || !childId) return;

        const id = `e${parentId}-${childId}-${label}`;
        if (edges.some((edge) => edge.id === id)) return; // Edge already exists
        if (childId && parentId) {
            edges.push({
                id,
                data: {
                    label: `${label}`,
                },
                markerEnd: { type: "arrow" },
                source: `${parentId}`,
                target: `${childId}`,
                type: "custom-edge",
            } as Edge);
            if (isSelectedFile) {
                // Add to adjacency map to be able to traverse graph via parents
                // To do: Find another way to track this?
                const currentParents = parentMap.get(childId) || [];
                parentMap.set(childId, [...currentParents, parentId]);
            }
        }
    });

    return { nodeMap, edges, parentMap };
}

export default [constructProvenanceLogic];
