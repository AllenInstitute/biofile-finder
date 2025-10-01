import { makeReducer } from "@aics/redux-utils";
import { Edge, Node } from "@xyflow/react";

import { SET_GRAPH_EDGES, SET_GRAPH_NODES } from "./actions";

export interface ProvenanceStateBranch {
    edges: Edge[];
    nodes: Node[];
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
