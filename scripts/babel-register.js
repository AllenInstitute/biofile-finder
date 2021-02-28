/**
 * Used in testing. See .mocharc.js.
 */

const register = require("@babel/register").default;

register({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    rootMode: "upward", // https://babeljs.io/docs/en/options#rootmode
});
