import { makeReducer } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";

import { RECEIVE_ANNOTATIONS } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
}

export const TOP_LEVEL_FILE_ANNOTATIONS = [
    new Annotation({
        annotationDisplayName: "File name",
        annotationName: "fileName",
        description: "Name of file",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "File path",
        annotationName: "filePath",
        description: "Path to file in storage.",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "Size",
        annotationName: "fileSize",
        description: "Size of file on disk.",
        type: AnnotationType.NUMBER,
        units: "bytes",
    }),
    new Annotation({
        annotationDisplayName: "Type",
        annotationName: "fileType",
        description: "Type of file.",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "Uploaded",
        annotationName: "uploaded",
        description: "Date and time file was uploaded.",
        type: AnnotationType.DATETIME,
    }),
    new Annotation({
        annotationDisplayName: "Uploaded by",
        annotationName: "uploadedBy",
        description: "Person or process who uploaded this file.",
        type: AnnotationType.STRING,
    }),
];

export const initialState = {
    annotations: [],
};

export default makeReducer<MetadataStateBranch>(
    {
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: action.payload,
        }),
    },
    initialState
);
