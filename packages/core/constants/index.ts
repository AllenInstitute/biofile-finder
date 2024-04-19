import Annotation, { AnnotationName } from "../entity/Annotation";
import { AnnotationType } from "../entity/AnnotationFormatter";

export const APP_ID = "fms-file-explorer-core";

// Refer to packages/fms-file-explorer-electron/src/main/menu
export enum FileExplorerServiceBaseUrl {
    LOCALHOST = "http://localhost:9081",
    STAGING = "https://staging.int.allencell.org",
    PRODUCTION = "https://production.int.allencell.org",
}

export const TOP_LEVEL_FILE_ANNOTATIONS = [
    new Annotation({
        annotationDisplayName: "File ID",
        annotationName: AnnotationName.FILE_ID,
        description: "File Id",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "File name",
        annotationName: AnnotationName.FILE_NAME,
        description: "Name of file",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "File path (Canonical)",
        annotationName: AnnotationName.FILE_PATH,
        description: "Path to file in storage.",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "Size",
        annotationName: AnnotationName.FILE_SIZE,
        description: "Size of file on disk.",
        type: AnnotationType.NUMBER,
        units: "bytes",
    }),
    new Annotation({
        annotationDisplayName: "Thumbnail path",
        annotationName: AnnotationName.THUMBNAIL_PATH,
        description: "Path to thumbnail file in storage.",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "Uploaded",
        annotationName: AnnotationName.UPLOADED,
        description: "Date and time file was uploaded.",
        type: AnnotationType.DATETIME,
    }),
];

export const TOP_LEVEL_FILE_ANNOTATION_NAMES = TOP_LEVEL_FILE_ANNOTATIONS.map(
    (annotation) => annotation.name
);
