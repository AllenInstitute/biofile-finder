module.exports = {
    extension: ["ts", "tsx", "js", "jsx"],
    spec: "src/**/test/*.test.*",
    require: [
        "./scripts/babel-register.js",
        "@babel/polyfill",
        "./scripts/css-modules-register.js",
        "../../scripts/jsdom-register.js",
        "../../scripts/setup-office-ui-fabric.js",
        "./scripts/adapt-enzyme-to-react-16.js",
    ],
    timeout: 10000, // 10s, woof
}
