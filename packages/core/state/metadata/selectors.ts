import { State } from "../";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getCollections = (state: State) => state.metadata.collections;
