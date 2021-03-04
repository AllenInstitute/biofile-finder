const path = require("path");

module.exports = {
    extension: ["ts", "tsx", "js", "jsx"],
    spec: "./**/test/*.test.*",
    require: [path.resolve(__dirname, "../..", "scripts/babel-register.js")],
};
