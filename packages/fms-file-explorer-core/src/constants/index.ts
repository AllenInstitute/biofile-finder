export const APP_ID = "fms-file-explorer-core";

// Refer to packages/fms-file-explorer-electron/src/main/menu
export enum DataSource {
    LOCALHOST = "http://localhost:9082", // HTTP proxy; see scripts/run-http-proxy.sh
    STAGING = "http://stg-aics-api.corp.alleninstitute.org",
    PRODUCTION = "http://aics-api.corp.alleninstitute.org",
}
