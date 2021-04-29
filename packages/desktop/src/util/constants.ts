// This constant is used to filter tests down to those that need to be run in the context
// of an Electron renderer process. If this constant is changed, you _must_ update the grep
// pattern used in the npm script used to invoke electron-mocha.
export const RUN_IN_RENDERER = "@renderer";

export enum FileDownloadServiceBaseUrl {
    LOCALHOST = "http://localhost:8080/labkey/fmsfiles/image",
    STAGING = "https://stg-aics.corp.alleninstitute.org/labkey/fmsfiles/image",
    PRODUCTION = "http://aics.corp.alleninstitute.org/labkey/fmsfiles/image",
}

export enum FileExplorerServiceBaseUrl {
    LOCALHOST = "http://localhost:9081",
    STAGING = "https://staging.int.allencell.org",
    PRODUCTION = "https://production.int.allencell.org",
}

// Channels global variables can be modified on / listen to
export enum GlobalVariableChannels {
    AllenMountPoint = "file-explorer-service-allen-mount-point-change",
    BaseUrl = "data-source-base-url",
}
