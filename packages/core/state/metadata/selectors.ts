import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getDataSources = (state: State) => state.metadata.dataSources;
export const getDatasetManifestSource = (state: State) => state.metadata.datasetManifestSource;
export const getEdgeDefinitions = (state: State) => state.metadata.edgeDefinitions;
export const getPasswordToProgramMap = (state: State) => state.metadata.passwordToProgramMap;

// COMPOSED SELECTORS

export const areAnnotationsLoaded = createSelector(
    getAnnotations,
    (annotations) => annotations.length > 0
);

export const getSortedAnnotations = createSelector(getAnnotations, Annotation.sort);

export const getAnnotationNameToAnnotationMap = createSelector(
    getAnnotations,
    (annotations): Map<string, Annotation> =>
        annotations.reduce(
            (map, annotation) => {
                map.set(annotation.path.join("."), annotation);
                return map;
            },
            new Map<string, Annotation>()
        )
);
