export const APP_ID = "fms-file-explorer-core";

// This matches a special "host" value in fms-file-explorer-electron/src/main/menu
// It is used as a sentinel to avoid making a call to the File Explorer Service when
// the intention has been set to pull data from the flat files bundled in the Electron app.
export const FLAT_FILE_DATA_SOURCE = "flat-file";
