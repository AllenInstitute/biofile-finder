export const APP_ID = "fms-file-explorer-core";

// Refer to packages/fms-file-explorer-electron/src/main/menu
export enum DataSource {
    LOCALHOST = "http://localhost:9081",
    STAGING = "http://stg-aics-api.corp.alleninstitute.org",
    PRODUCTION = "http://aics-api.corp.alleninstitute.org",
}
