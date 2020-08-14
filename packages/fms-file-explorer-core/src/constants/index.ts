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
    TYPE = "Type", // matches an annotation in filemetadata.annoation
}
