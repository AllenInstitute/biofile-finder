import Annotation from "../entity/Annotation";
import AnnotationName from "../entity/Annotation/AnnotationName";
import { AnnotationType } from "../entity/AnnotationFormatter";

export const APP_ID = "fms-file-explorer-core";

// Refer to packages/fms-file-explorer-electron/src/main/menu
export enum Environment {
    LOCALHOST = "LOCALHOST",
    STAGING = "STAGING",
    PRODUCTION = "PRODUCTION",
    TEST = "TEST",
}

export const TOP_LEVEL_FILE_ANNOTATIONS = [
    new Annotation({
        annotationDisplayName: "File ID",
        annotationName: AnnotationName.FILE_ID,
        description: "ID for file.",
        type: AnnotationType.STRING,
        isImmutable: true,
    }),
    new Annotation({
        annotationDisplayName: "File Name",
        annotationName: AnnotationName.FILE_NAME,
        description: "Name of file.",
        type: AnnotationType.STRING,
        isImmutable: true,
    }),
    new Annotation({
        annotationDisplayName: "File Path (Cloud)",
        annotationName: AnnotationName.FILE_PATH,
        description: "Path to file in the cloud.",
        type: AnnotationType.STRING,
        isImmutable: true,
    }),
    new Annotation({
        annotationDisplayName: "Size",
        annotationName: AnnotationName.FILE_SIZE,
        description: "Size of file on disk.",
        type: AnnotationType.NUMBER,
        units: "bytes",
        isImmutable: true,
    }),
    new Annotation({
        annotationDisplayName: "Thumbnail Path",
        annotationName: AnnotationName.THUMBNAIL_PATH,
        description: "Path to thumbnail file in storage.",
        type: AnnotationType.STRING,
        isImmutable: true,
    }),
    new Annotation({
        annotationDisplayName: "Uploaded",
        annotationName: AnnotationName.UPLOADED,
        description: "Date and time file was uploaded.",
        type: AnnotationType.DATETIME,
        isImmutable: true,
    }),
];

export const TOP_LEVEL_FILE_ANNOTATION_NAMES = TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.name);

export const AICS_FMS_DATA_SOURCE_NAME = "AICS FMS";

export enum FESBaseUrl {
    LOCALHOST = "http://localhost:9081",
    STAGING = "https://staging.int.allencell.org",
    PRODUCTION = "https://production.int.allencell.org",
    TEST = "http://test.int.allencell.org",
}

export enum MMSBaseUrl {
    LOCALHOST = "https://localhost:9060",
    STAGING = "https://stg-aics.corp.alleninstitute.org",
    PRODUCTION = "https://aics.corp.alleninstitute.org",
    TEST = "http://test-aics-mms-api.corp.alleninstitute.org",
}

export enum LoadBalancerBaseUrl {
    LOCALHOST = "http://localhost:8080",
    STAGING = "http://stg-aics.corp.alleninstitute.org",
    PRODUCTION = "http://aics.corp.alleninstitute.org",
    TEST = "http://test-aics.corp.alleninstitute.org",
}

export enum DatasetBucketUrl {
    LOCALHOST = "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com",
    STAGING = "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com",
    PRODUCTION = "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com",
    TEST = "http://test-aics.corp.alleninstitute.org",
}

export enum CellFeatureExplorerBaseUrl {
    LOCALHOST = "http://localhost:9002",
    // TODO: Update this once the public build of CFE includes support for the
    // csvUrl param, e.g.:
    // STAGING = "https://cfe.allencell.org"
    STAGING = "http://dev-aics-dtp-001.corp.alleninstitute.org/cell-feature-explorer/dist",
    PRODUCTION = "http://dev-aics-dtp-001.corp.alleninstitute.org/cell-feature-explorer/dist",
    TEST = "http://dev-aics-dtp-001.corp.alleninstitute.org/cell-feature-explorer/dist",
}

export enum TemporaryFileServiceBaseUrl {
    LOCALHOST = "http://localhost:5000",
    STAGING = "http://dev-aics-dtp-001.corp.alleninstitute.org:8080",
    PRODUCTION = "http://dev-aics-dtp-001.corp.alleninstitute.org:8080",
    TEST = "http://dev-aics-dtp-001.corp.alleninstitute.org:8080",
}

export const UNSAVED_DATA_WARNING =
    "Edits to data source files are not preserved by this app. Download to save a copy with your changes.";
