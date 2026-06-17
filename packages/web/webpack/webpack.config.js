const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

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

            // this rule processes any CSS written for this project.
            // It applies PostCSS plugins and converts it to CSS Modules
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

            // this rule will handle any vanilla CSS imports out of node_modules; it does not apply PostCSS,
            // nor does it convert the imported css to CSS Modules
            // use case: importing antd component css
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
    plugins: getPluginsByEnv(production, analyze),
    resolve: {
        alias: {
            process: "process/browser",
        },
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".png"],
        // Fallbacks are used to resolve runtime errors:
        // webpack < 5 used to include polyfills for node.js core modules by default.
        // This is no longer the case. Verify if you need this module and configure a polyfill for it.
        fallback: {
            buffer: require.resolve("buffer"),
            crypto: require.resolve("crypto-browserify"),
            fs: false,
            http: require.resolve("stream-http"),
            https: require.resolve("https-browserify"),
            path: require.resolve("path-browserify"),
            stream: require.resolve("stream-browserify"),
            url: require.resolve("url/"),
            util: require.resolve("util/"),
            vm: require.resolve("vm-browserify"),
        },
        mainFields: ["module", "main"],
        symlinks: false,
    },
    stats: analyze ? "none" : stats,
});
