module.exports = {
    extension: ["ts", "tsx", "js", "jsx"],
    spec: "src/**/test/*.test.*",
    require: ["./scripts/babel-register.js", "./scripts/set-env-vars.js"],
};
