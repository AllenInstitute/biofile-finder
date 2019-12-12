import { State } from "../";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getAnnotationNameToValuesMap = (state: State) =>
    state.metadata.annotationNameToValuesMap;
