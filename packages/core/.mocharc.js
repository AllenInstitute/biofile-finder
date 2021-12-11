const path = require("path");

module.exports = {
    extension: ["ts", "tsx", "js", "jsx"],
    spec: "./**/test/*.test.*",
    require: [
        path.resolve(__dirname, "..", "..", "scripts", "babel-register.js"),
        path.resolve(__dirname, "..", "..", "scripts", "css-modules-register.js"),
        path.resolve(__dirname, "..", "..", "scripts", "jsdom-register.js"),
        path.resolve(__dirname, "..", "..", "scripts", "setup-fluentui.js"),
        path.resolve(__dirname, "..", "..", "scripts", "adapt-enzyme-to-react-16.js"),
    ],
};
