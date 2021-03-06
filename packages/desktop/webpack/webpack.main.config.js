const path = require("path");

const { Env, stats } = require("./constants");

module.exports = ({ env } = {}) => ({
    devtool: env !== Env.PRODUCTION && "source-map",
    entry: {
        main: path.resolve("src", "main", "index.ts"),
    },
    mode: env === Env.PRODUCTION ? "production" : "development",
    module: {
        rules: [
            {
                test: /\.(j|t)sx?/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            extends: path.resolve(__dirname, "..", "..", "..", "babel.config.json"),
                            presets: [
                                [
                                    "@babel/preset-env",
                                    {
                                        targets: {
                                            node: "current",
                                        },
                                    },
                                ],
                            ],
                        },
                    },
                ],
            },
            {
                test: (filepath) => filepath.endsWith(".css"),
                use: [{ loader: "null-loader" }],
            },
        ],
    },
    output: {
        path: path.resolve(__dirname, "..", "dist", "main"),
        filename: "index.js",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        mainFields: ["module", "main"],
        symlinks: false,
    },
    stats,
    target: "electron-main",
});
