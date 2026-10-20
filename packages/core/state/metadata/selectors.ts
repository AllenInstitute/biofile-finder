import { keyBy } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import ColumnCoder from "../../entity/SearchParams/ColumnCoder";

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

// Index by full dotted path
export const getAnnotationNameToAnnotationMap = createSelector(
    getAnnotations,
    (annotations): Map<string, Annotation> => {
        const byFullPath = keyBy(annotations, (annotation) => annotation.name);
        return new Map(Object.entries({ ...byFullPath }));
    }
);

export const getAnnotationPrefixes = createSelector(getAnnotations, (annotations) => {
    const annotationPaths = annotations.filter((a) => !a.isParent).map((a) => a.path);
    return ColumnCoder.buildPrefixesFromFullPaths(annotationPaths);
});
