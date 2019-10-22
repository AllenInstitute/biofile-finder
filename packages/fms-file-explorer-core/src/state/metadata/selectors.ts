import { State } from "../types";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
