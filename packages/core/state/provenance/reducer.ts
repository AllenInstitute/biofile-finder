import { makeReducer } from "@aics/redux-utils";
import { Edge, Node } from "@xyflow/react";

import { SET_GRAPH_EDGES, SET_GRAPH_NODES } from "./actions";
import FileDetail from "../../entity/FileDetail";
import { FmsFileAnnotation } from "../../services/FileService";

export interface ProvenanceStateBranch {
    edges: Edge[];
    nodes: ProvenanceNode[];
}

export const initialState = {
    nodes: [],
    edges: [],
};

interface EdgeNode {
    name: string;
    type: "entity" | "file";
}

export interface EdgeDefinition {
    parent: EdgeNode;
    child: EdgeNode;
    relationship: string;
}

export interface ProvenanceNode extends Node {
    data: {
        isSelected: boolean;

        // Is present when the Node represents a file
        file?: FileDetail;

        // Is present when the node represents an annotation
        annotation?: FmsFileAnnotation;
    };
}

export default makeReducer<ProvenanceStateBranch>(
    {
        [SET_GRAPH_EDGES]: (state, action) => ({
            ...state,
            edges: action.payload,
        }),
        [SET_GRAPH_NODES]: (state, action) => ({
            ...state,
            nodes: action.payload,
        }),
    },
    initialState
);
