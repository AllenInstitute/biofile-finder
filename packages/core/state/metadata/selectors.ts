import { keyBy } from "lodash";
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
    (annotations): Map<string, Annotation> => {
        // Index by last segment first (lower priority), then by full dotted path (higher priority).
        // This lets sub-field rows (which only know their local field name, e.g. "Value") find their
        // annotation, while full-path keys ("Well.Value") win over any name-only collisions.
        const byName = keyBy(annotations, (annotation) => annotation.name);
        const byFullPath = keyBy(annotations, (annotation) => annotation.path.join("."));
        return new Map(Object.entries({ ...byName, ...byFullPath }));
    }
);
