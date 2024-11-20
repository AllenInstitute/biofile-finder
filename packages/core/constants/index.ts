import Annotation from "../entity/Annotation";
import AnnotationName from "../entity/Annotation/AnnotationName";
import { AnnotationType } from "../entity/AnnotationFormatter";

export const APP_ID = "fms-file-explorer-core";

// Refer to packages/fms-file-explorer-electron/src/main/menu
export const Environment = {
    LOCALHOST: "LOCALHOST",
    STAGING: "STAGING",
    PRODUCTION: "PRODUCTION",
    TEST: "TEST",
} as const;

export const TOP_LEVEL_FILE_ANNOTATIONS = [
    new Annotation({
        annotationDisplayName: "File ID",
        annotationName: AnnotationName.FILE_ID,
        description: "ID for file.",
        type: AnnotationType.STRING,
    }),
    new Annotation({
        annotationDisplayName: "File Name",
        annotationName: AnnotationName.FILE_NAME,
        description: "Name of file.",
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

export const FESBaseUrlMap = {
    LOCALHOST: "http://localhost:9081",
    STAGING: "https://staging.int.allencell.org",
    PRODUCTION: "https://production.int.allencell.org",
    TEST: "http://test.int.allencell.org",
};

export const MMSBaseUrlMap = {
    LOCALHOST: "http://localhost:9060",
    STAGING: "http://stg-aics-api",
    PRODUCTION: "http://prod-aics-api",
    TEST: "http://test-aics-api",
};

export const LoadBalancerBaseUrlMap = {
    LOCALHOST: "http://localhost:8080",
    STAGING: "http://stg-aics.corp.alleninstitute.org",
    PRODUCTION: "http://aics.corp.alleninstitute.org",
    TEST: "http://test-aics.corp.alleninstitute.org",
};
