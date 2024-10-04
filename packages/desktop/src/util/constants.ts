// This constant is used to filter tests down to those that need to be run in the context
// of an Electron renderer process. If this constant is changed, you _must_ update the grep
// pattern used in the npm script used to invoke electron-mocha.
export const RUN_IN_RENDERER = "@renderer";

export enum FileDownloadServiceBaseUrl {
    LOCALHOST = "http://localhost:8080/labkey/fmsfiles/image",
    STAGING = "http://stg-aics.corp.alleninstitute.org/labkey/fmsfiles/image",
    PRODUCTION = "http://aics.corp.alleninstitute.org/labkey/fmsfiles/image",
}

export enum FileExplorerServiceBaseUrl {
    LOCALHOST = "http://localhost:9081",
    STAGING = "https://staging.int.allencell.org",
    PRODUCTION = "https://production.int.allencell.org",
}

// TODO: Do we need this?
export enum MetadataManagementServiceBaseUrl {
    LOCALHOST = "http://localhost:9060/metadata-management-service",
    STAGING = "http://stg-aics-api/metadata-management-service",
    PRODUCTION = "http://aics-api/metadata-management-service",
}

// Channels global variables can be modified on / listen to
export enum GlobalVariableChannels {
    BaseUrl = "data-source-base-url",
}
