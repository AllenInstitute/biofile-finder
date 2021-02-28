/**
 * Used in testing. See .mocharc.js.
 */

const hook = require("css-modules-require-hook");

hook({
    camelCase: true,
    generateScopedName: "[name]__[local]___[hash:base64:5]",
});
