import Annotation from "../entity/Annotation";
import { AnnotationType } from "../entity/AnnotationFormatter";
import FileFilter from "../entity/FileFilter";

export const APP_ID = "fms-file-explorer-core";

// Refer to packages/fms-file-explorer-electron/src/main/menu
export enum FileExplorerServiceBaseUrl {
    LOCALHOST = "http://localhost:9081",
    STAGING = "https://staging.int.allencell.org",
    PRODUCTION = "https://production.int.allencell.org",
}

// TypeScript (3.9) raises a bizarre error if this is an enum
// Reference issue without clear resolution: https://github.com/microsoft/TypeScript/issues/6307
export const AnnotationName = {
    KIND: "Kind", // matches an annotation in filemetadata.annotation
    FILE_ID: "file_id", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_NAME: "file_name", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_SIZE: "file_size", // a file attribute (top-level prop on file documents in MongoDb)
    FILE_PATH: "file_path", // a file attribute (top-level prop on file documents in MongoDb)
    PLATE_BARCODE: "Plate Barcode",
    THUMBNAIL_PATH: "thumbnail", // (optional) file attribute (top-level prop on the file documents in MongoDb)
    TYPE: "Type", // matches an annotation in filemetadata.annotation
    UPLOADED: "uploaded", // matches an annotation in filemetadata.annotation
};

// Date range options where the date range is a computed value based on the relative date to today
const BEGINNING_OF_TODAY = new Date();
BEGINNING_OF_TODAY.setHours(0, 0, 0, 0);
const END_OF_TODAY = new Date();
END_OF_TODAY.setHours(23, 59, 59);
const DATE_LAST_YEAR = new Date(BEGINNING_OF_TODAY);
DATE_LAST_YEAR.setMonth(BEGINNING_OF_TODAY.getMonth() - 12);
const DATE_LAST_6_MONTHS = new Date(BEGINNING_OF_TODAY);
DATE_LAST_6_MONTHS.setMonth(BEGINNING_OF_TODAY.getMonth() - 6);
const DATE_LAST_MONTH = new Date(BEGINNING_OF_TODAY);
DATE_LAST_MONTH.setMonth(BEGINNING_OF_TODAY.getMonth() - 1);
const DATE_LAST_WEEK = new Date(BEGINNING_OF_TODAY);
DATE_LAST_WEEK.setDate(BEGINNING_OF_TODAY.getDate() - 7);
export const RELATIVE_DATE_RANGES = [
    {
        name: "Uploaded in last year",
        description:
            "This will automatically filter files down to those uploaded within the last year",
        filters: [
            new FileFilter(
                AnnotationName.UPLOADED,
                `RANGE(${DATE_LAST_YEAR.toISOString()},${END_OF_TODAY.toISOString()})`
            ),
        ],
        hierarchy: undefined,
        sort: undefined,
    },
    {
        name: "Uploaded in last 6 months",
        description:
            "This will automatically filter files down to those uploaded within the last 6 months",
        filters: [
            new FileFilter(
                AnnotationName.UPLOADED,
                `RANGE(${DATE_LAST_6_MONTHS.toISOString()},${END_OF_TODAY.toISOString()})`
            ),
        ],
        hierarchy: undefined,
        sort: undefined,
    },
    {
        name: "Uploaded in last month",
        description:
            "This will automatically filter files down to those uploaded within the last month",
        filters: [
            new FileFilter(
                AnnotationName.UPLOADED,
                `RANGE(${DATE_LAST_MONTH.toISOString()},${END_OF_TODAY.toISOString()})`
            ),
        ],

        hierarchy: undefined,
        sort: undefined,
    },
    {
        name: "Uploaded in last week",
        description:
            "This will automatically filter files down to those uploaded within the last week",
        filters: [
            new FileFilter(
                AnnotationName.UPLOADED,
                `RANGE(${DATE_LAST_WEEK.toISOString()},${END_OF_TODAY.toISOString()})`
            ),
        ],

        hierarchy: undefined,
        sort: undefined,
    },
    {
        name: "Uploaded today",
        description: "This will automatically filter files down to those uploaded today",
        filters: [
            new FileFilter(
                AnnotationName.UPLOADED,
                `RANGE(${BEGINNING_OF_TODAY.toISOString()},${END_OF_TODAY.toISOString()})`
            ),
        ],
        hierarchy: undefined,
        sort: undefined,
    },
];

export const TOP_LEVEL_FILE_ANNOTATIONS = [
    new Annotation({
        annotationDisplayName: "File ID",
        annotationName: AnnotationName.FILE_ID,
        description: "FMS File Id",
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
        description: "Path to file in storage from allen drive.",
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

export const TOP_LEVEL_FILE_ANNOTATION_NAMES = TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.name);
