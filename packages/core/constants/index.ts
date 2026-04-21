import Annotation from "../entity/Annotation";
import AnnotationName from "../entity/Annotation/AnnotationName";
import { AnnotationType } from "../entity/AnnotationFormatter";

export const APP_ID = "file-explorer-core";

/**
 * Legacy environment enum. Only a single default (PRODUCTION) is used now that
 * AICS backends are no longer contacted, but the shape is preserved for callers
 * that still parameterize on environment.
 */
export enum Environment {
    LOCALHOST = "LOCALHOST",
    STAGING = "STAGING",
    PRODUCTION = "PRODUCTION",
    TEST = "TEST",
}

/**
 * "Top-level" (i.e. predefined) file annotations. These are surfaced in the UI
 * even before a data source is loaded.
 */
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
        annotationDisplayName: "File Path",
        annotationName: AnnotationName.FILE_PATH,
        description: "Path to file.",
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

/**
 * Sentinel name. No real AICS FMS backend is configured; this constant is kept
 * only so legacy "is this the AICS FMS data source" checks continue to
 * type-check and evaluate to false for any user-provided data source.
 */
export const AICS_FMS_DATA_SOURCE_NAME = "__disabled_aics_fms_data_source__";
export const HIDDEN_UID_ANNOTATION = "hidden_bff_uid";

export const UNSAVED_DATA_WARNING =
    "Edits to data source files are not preserved by this app.";

