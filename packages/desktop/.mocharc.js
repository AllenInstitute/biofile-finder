const path = require("path");

module.exports = {
    extends: path.resolve(__dirname, "../../.mocharc.js"),
    require: ["./scripts/set-env-vars.js"],
};
