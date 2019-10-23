import { State } from "../types";

// BASIC SELECTORS
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
