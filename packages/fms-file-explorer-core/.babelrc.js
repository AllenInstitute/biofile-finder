module.exports = (api) => {
  api.cache(true);

  return {
    plugins: [
      "@babel/plugin-proposal-class-properties",
      "@babel/plugin-proposal-optional-chaining",
      ["babel-plugin-import", {
        camel2DashComponentName: false,
        libraryDirectory: "",
        libraryName: "lodash"
      }, "lodash"]
    ],
    presets: [
      "@babel/preset-react",
      ["@babel/preset-env", { modules: false }],
      "@babel/preset-typescript"
    ],
    env: {
      // used when compiling library for use in electron's main process in fms-file-explorer-electron
      nodejs: {
        plugins: [["./scripts/babel-plugin-filter-imports", { test: "\\.css$" }]],
        presets: [["@babel/preset-env", { modules: "commonjs" }]]
      },
      test: {
        presets: [["@babel/preset-env", { modules: "commonjs" }]]
      }
    }
  };
}