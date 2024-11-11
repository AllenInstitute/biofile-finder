import Annotation from "../entity/Annotation";
import AnnotationName from "../entity/Annotation/AnnotationName";
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
        description:
            "Auto or manually generated unique ID for file. Should not be used for collaboration or sharing as it may change.",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "File Name",
        annotationName: AnnotationName.FILE_NAME,
        description: "Name of file",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "File Path (Canonical)",
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
        annotationDisplayName: "Thumbnail Path",
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

export const TOP_LEVEL_FILE_ANNOTATION_NAMES = TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.name);

export const THUMBNAIL_SIZE_TO_NUM_COLUMNS = {
    LARGE: 5,
    SMALL: 10,
};

export const AICS_FMS_DATA_SOURCE_NAME = "AICS FMS";
