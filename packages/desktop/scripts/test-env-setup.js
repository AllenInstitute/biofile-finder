/**
 * Imported by mocha-electron into the Electron renderer process.
 * See the `test:renderer` npm script.
 */
require("regenerator-runtime/runtime");

const sinon = require("sinon");
const electron = require("electron");

// Create a global mock for ipcRenderer
const ipcRendererMock = {
    invoke: sinon.stub(),
    send: sinon.stub(),
    on: sinon.stub(),
    removeListener: sinon.stub(),
};

// Replace Electron's ipcRenderer with the mock
electron.ipcRenderer = ipcRendererMock;
