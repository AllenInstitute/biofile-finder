const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin"); // Importing the polyfill plugin

const { devServer, stats } = require("./constants");
const getPluginsByEnv = require("./plugins");

module.exports = ({ analyze, production } = {}) => ({
    devtool: !production && "source-map",
    devServer: {
        host: devServer.host,
        port: devServer.port,
        historyApiFallback: true,
    },
    entry: {
        app: "./src/index.tsx",
    },
    mode: production ? "production" : "development",
    target: "electron-renderer", // Set the target to 'electron-renderer' to properly configure for Electron
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
                            presets: ["@babel/preset-env"],
                        },
                    },
                ],
            },
            {
                test: /\.css/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                            modules: {
                                exportLocalsConvention: "camelCase",
                                localIdentName: "[name]__[local]--[hash:base64:5]",
                            },
                            sourceMap: !production,
                        },
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            postcssOptions: {
                                plugins: ["postcss-preset-env"],
                            },
                            sourceMap: !production,
                        },
                    },
                ],
            },
            {
                test: (filepath) => filepath.endsWith(".css"),
                include: /node_modules/,
                use: [{ loader: MiniCssExtractPlugin.loader }, { loader: "css-loader" }],
            },
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: "babel-loader",
                    },
                    {
                        loader: "react-svg-loader",
                        options: {
                            tsx: true, // true outputs tags
                        },
                    },
                ],
            },
            {
                test: /\.png/,
                type: "asset/resource",
            },
        ],
    },
    output: {
        path: path.resolve(__dirname, "../", "dist"),
        filename: "[name].[chunkhash].js",
    },
    plugins: [
        ...getPluginsByEnv(production, analyze),
        new NodePolyfillPlugin(), // Ensure Node polyfills are applied
    ],
    externals: {
        fs: "commonjs fs", // Marking 'fs' and 'path' as external to avoid bundling them
        path: "commonjs path",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".png"],
        mainFields: ["module", "main"],
        symlinks: false,
    },
    stats: analyze ? "none" : stats,
});
