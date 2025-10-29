import { makeConstant } from "@aics/redux-utils";
import { Edge, Node } from "@xyflow/react";

import FileDetail from "../../entity/FileDetail";

const STATE_BRANCH_NAME = "provenance";

/**
 * SET_GRAPH_NODES
 *
 * Wholesale replacement of provenance graph node data in state
 */
export const SET_GRAPH_NODES = makeConstant(STATE_BRANCH_NAME, "set-graph-nodes");

export interface SetGraphNodesAction {
    payload: Node[];
    type: string;
}

export function setGraphNodes(nodes: Node[]): SetGraphNodesAction {
    return {
        payload: nodes,
        type: SET_GRAPH_NODES,
    };
}

/**
 * SET_GRAPH_EDGES
 *
 * Wholesale replacement of provenance graph edge data in state
 */
export const SET_GRAPH_EDGES = makeConstant(STATE_BRANCH_NAME, "set-graph-edges");

export interface SetGraphEdgesAction {
    payload: Edge[];
    type: string;
}

export function setGraphEdges(edges: Edge[]): SetGraphEdgesAction {
    return {
        payload: edges,
        type: SET_GRAPH_EDGES,
    };
}

/**
 * CONSTRUCT_PROVENANCE_GRAPH
 *
 * Intention to construct the nodes and edges for the provenance graph
 */
export const CONSTRUCT_PROVENANCE_GRAPH = makeConstant(STATE_BRANCH_NAME, "construct-provenance");

export interface ConstructProvenanceGraph {
    payload: FileDetail;
    type: string;
}

export function constructProvenanceGraph(fileDetails: FileDetail): ConstructProvenanceGraph {
    return {
        payload: fileDetails,
        type: CONSTRUCT_PROVENANCE_GRAPH,
    };
}
