import { State } from "../";

// BASIC SELECTORS
export const getNodesForModal = (state: State) => state.provenance.nodes;
export const getEdgesForModal = (state: State) => state.provenance.edges;
