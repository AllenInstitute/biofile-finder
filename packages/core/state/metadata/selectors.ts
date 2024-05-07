import { createSelector } from "reselect";

import { State } from "../";
import Annotation, { AnnotationName } from "../../entity/Annotation";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getCollections = (state: State) => state.metadata.collections;

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
