import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getDataSources = (state: State) => state.metadata.dataSources;
export const getDatasetManifestSource = (state: State) => state.metadata.datasetManifestSource;

// COMPOSED SELECTORS
export const getSortedAnnotations = createSelector(getAnnotations, (annotations: Annotation[]) => {
    // Sort annotations by file name first then everything else alphabetically
    const fileNameAnnotationIndex = annotations.findIndex(
        (annotation) =>
            annotation.name === AnnotationName.FILE_NAME || annotation.name === "File Name"
    );
    if (fileNameAnnotationIndex === -1) {
        return Annotation.sort(annotations);
    }
    return [
        annotations[fileNameAnnotationIndex],
        ...Annotation.sort([
            ...annotations.slice(0, fileNameAnnotationIndex),
            ...annotations.slice(fileNameAnnotationIndex + 1),
        ]),
    ];
});

export const getEdittableAnnotations = createSelector(getAnnotations, (annotations) =>
    annotations.filter((annotation) => !annotation.isImmutable)
);

export const getAnnotationNameToAnnotationMap = createSelector(
    getAnnotations,
    (annotations): Record<string, Annotation> =>
        annotations.reduce(
            (map, annotation) => ({
                ...map,
                [annotation.name]: annotation,
            }),
            {} as Record<string, Annotation>
        )
);
