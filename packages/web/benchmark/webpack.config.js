const path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    context: __dirname,
    entry: "./src/index.ts",
    mode: "development",
    devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.(t|j)sx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        // Reuse the root babel config; override preset-env for browser output
                        extends: path.resolve(__dirname, "..", "..", "..", "babel.config.json"),
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "benchmark.js",
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "index.html"),
        }),
    ],
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        // Prefer ESM builds (needed for @duckdb/duckdb-wasm tree-shaking)
        mainFields: ["module", "main"],
        fallback: {
            // Node built-ins not available in browser — explicitly disable
            path: false,
            fs: false,
            crypto: false,
            buffer: false,
        },
    },
};
