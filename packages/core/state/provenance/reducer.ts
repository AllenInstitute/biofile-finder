import { makeReducer } from "@aics/redux-utils";
import { Edge, Node } from "@xyflow/react";

import { SET_GRAPH_EDGES, SET_GRAPH_NODES } from "./actions";
import { FmsFileAnnotation } from "../../services/FileService";

export interface ProvenanceStateBranch {
    edges: Edge[];
    nodes: ProvenanceNode[];
}

export const initialState = {
    nodes: [],
    edges: [],
};

export interface EdgeDefinition {
    parent: string;
    child: string;
    label: string;
}

export interface ProvenanceNode extends Node {
    data: {
        label?: string;
        annotation?: FmsFileAnnotation;
        isCurrentFile?: boolean;
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
