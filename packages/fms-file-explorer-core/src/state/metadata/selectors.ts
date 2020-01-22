import { State } from "../";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
