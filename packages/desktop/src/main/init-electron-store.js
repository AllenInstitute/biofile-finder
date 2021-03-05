/**
 * Since v7 of electron-store, it is required to call Store::initRenderer
 * in the main process before it can be used in the renderer process.
 */
const Store = require("electron-store");

Store.initRenderer();
