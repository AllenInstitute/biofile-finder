const path = require("path");

module.exports = {
    extension: ["ts", "tsx", "js", "jsx"],
    spec: "src/**/test/*.test.*",
    require: [
        path.resolve(__dirname, "..", "..", "scripts/babel-register.js"),
        path.resolve(__dirname, "scripts", "set-env-vars.js"),
        path.resolve(__dirname, "..", "..", "scripts", "setup-svg.js"),
    ],
    timeout: 1000 * 60, // 1m, in ms
};
