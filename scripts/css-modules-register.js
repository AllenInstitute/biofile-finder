/**
 * Used in testing. See .mocharc.js.
 */

const Module = require("module");

const cssProxy = new Proxy(
    {},
    {
        get: (_, key) => key,
    }
);

Module._extensions[".css"] = function (module) {
    module.exports = cssProxy;
};
