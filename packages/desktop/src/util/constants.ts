// This constant is used to filter tests down to those that need to be run in the context
// of an Electron renderer process. If this constant is changed, you _must_ update the grep
// pattern used in the npm script used to invoke electron-mocha.
export const RUN_IN_RENDERER = "@renderer";

export const Environment = {
    LOCALHOST: "LOCALHOST",
    STAGING: "STAGING",
    PRODUCTION: "PRODUCTION",
    TEST: "TEST",
};

// Channels global variables can be modified on / listen to
export enum GlobalVariableChannels {
    BaseUrl = "data-source-base-url",
}
