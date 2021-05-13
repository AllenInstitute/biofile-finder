const path = require("path");

module.exports = {
    extension: ["ts", "tsx", "js", "jsx"],
    spec: "src/**/test/*.test.*",
    require: [
        path.resolve(__dirname, "..", "..", "scripts/babel-register.js"),
        path.resolve(__dirname, "scripts", "set-env-vars.js"),
    ],
    timeout: 10000, // 10s, in ms
};
