/**
 * Used in testing.
 */
const register = require("@babel/register").default;
register({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    // By default, babel register will only hook into calls for code underneath
    // `cwd` of where mocha is called. This means that when running tests from within
    // the `desktop` or `web` directories, code from `core` will not be transpiled.
    // The following ensures that code from `core` is in fact processed by babel
    // when being run by mocha.
    only: [/core/, /desktop/, /web/],
    rootMode: "upward", // https://babeljs.io/docs/en/options#rootmode
});
