const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const { devServer, stats } = require("./constants");
const getPluginsByEnv = require("./plugins");

module.exports = ({ analyze, production } = {}) => ({
    devtool: !production && "source-map",
    devServer: {
        client: {
            overlay: {
                // Disable showing overlay for warnings until
                // https://github.com/amplitude/Amplitude-Node/issues/122 is addressed
                warnings: false,
            },
        },
        host: devServer.host,
        port: devServer.port,
    },
    entry: {
        app: path.resolve("src", "renderer", "index.tsx"),
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
                            presets: [
                                [
                                    "@babel/preset-env",
                                    {
                                        targets: {
                                            electron: "16.0.0",
                                        },
                                    },
                                ],
                            ],
                        },
                    },
                ],
            },

            // This rule processes any CSS written for this project.
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
        ],
    },
    output: {
        path: path.resolve(__dirname, "..", "dist", "renderer"),
        filename: "[name].[chunkhash].js",
    },
    plugins: getPluginsByEnv(production, analyze),
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        mainFields: ["module", "main"],
        symlinks: false,
    },
    stats: analyze ? "none" : stats,
    target: "electron-renderer",
});
