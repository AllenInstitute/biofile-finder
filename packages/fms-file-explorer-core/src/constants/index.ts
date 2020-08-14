import Annotation from "../entity/Annotation";
import { AnnotationType } from "../entity/AnnotationFormatter";

export const APP_ID = "fms-file-explorer-core";

// Refer to packages/fms-file-explorer-electron/src/main/menu
export enum DataSource {
    LOCALHOST = "http://localhost:9081",
    STAGING = "http://stg-aics-api.corp.alleninstitute.org",
    PRODUCTION = "http://aics-api.corp.alleninstitute.org",
}

export enum AnnotationName {
    KIND = "Kind", // matches an annotation in filemetadata.annoation
    FILE_NAME = "fileName", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_SIZE = "fileSize", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_PATH = "filePath", // a file attribute (top-level prop on file documents in MongoDb)
    TYPE = "Type", // matches an annotation in filemetadata.annoation
    UPLOADED = "uploaded", // matches an annotation in filemetadata.annoation
    UPLOADED_BY = "uploadedBy", // matches an annotation in filemetadata.annoation
}

export const TOP_LEVEL_FILE_ANNOTATIONS = [
    new Annotation({
        annotationDisplayName: "File name",
        annotationName: AnnotationName.FILE_NAME,
        description: "Name of file",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "File path",
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
        annotationDisplayName: "Uploaded",
        annotationName: AnnotationName.UPLOADED,
        description: "Date and time file was uploaded.",
        type: AnnotationType.DATETIME,
    }),
    new Annotation({
        annotationDisplayName: "Uploaded by",
        annotationName: AnnotationName.UPLOADED_BY,
        description: "Person or process who uploaded this file.",
        type: AnnotationType.STRING,
    }),
];
