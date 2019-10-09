const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const {
    devServer,
    Env,
    stats,
} = require("./constants");
const getPluginsByEnv = require("./plugins");

module.exports = ({ analyze, env } = {}) => ({
    devtool: env !== Env.PRODUCTION && "source-map",
    devServer: {
        contentBase: path.join(__dirname, "../", "dist"),
        disableHostCheck: true,
        host: devServer.host,
        port: devServer.port,
        stats,
    },
    entry: {
        app: "./src/index.tsx"
    },
    mode: env === Env.PRODUCTION ? "production" : "development",
    module: {
        rules: [
            {
                test: /\.(j|t)sx?/,
                include: [
                    path.resolve(__dirname, "../", "src")
                ],
                exclude: /node_modules/,
                use: [
                    { loader: "babel-loader" },
                ],
            },

            // this rule processes any CSS written for this project and contained in src/
            // it applies PostCSS plugins and converts it to CSS Modules
            {
                test: /\.module.css/,
                include: [
                    path.resolve(__dirname, "../", "src")
                ],
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                            localsConvention: "camelCase",
                            modules: {
                                localIdentName: "[name]__[local]--[hash:base64:5]",
                            },
                            sourceMap: env !== Env.PRODUCTION
                        }
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            ident: "postcss",
                            plugins: [
                                require("postcss-flexbugs-fixes"),
                                require("postcss-preset-env")({
                                    autoprefixer: {
                                        flexbox: "no-2009",
                                    },
                                }),
                            ],
                            sourceMap: env !== Env.PRODUCTION,
                        }
                    },
                ],
            },

            // this rule will handle any vanilla CSS imports out of node_modules; it does not apply PostCSS,
            // nor does it convert the imported css to CSS Modules
            // use case: importing antd component css
            {
                test: (filepath) => filepath.endsWith(".css") && !filepath.endsWith(".module.css"),
                include: /node_modules/,
                use: [
                    { loader: MiniCssExtractPlugin.loader },
                    { loader: "css-loader" },
                ],
            },

            // this rule will handle any CSS Module imports out of node_modules; it does not apply PostCSS
            // use case: importing CSS Modules from fms-file-explorer-core
            {
                test: /\.module.css/,
                include: /node_modules/,
                use: [
                    { loader: MiniCssExtractPlugin.loader },
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                            localsConvention: "camelCase",
                            modules: {
                                localIdentName: "[name]__[local]--[hash:base64:5]",
                            },
                            sourceMap: env !== Env.PRODUCTION
                        }
                    },
                ],
            },
        ]
    },
    optimization: {
        runtimeChunk: 'single',
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    filename: 'vendor.[contenthash].js',
                    test: /[\\/]node_modules[\\/]/,
                },
            }
        }
    },
    output: {
        path: path.resolve(__dirname, "../", "dist"),
        filename: "[name].[chunkhash].js"
    },
    plugins: getPluginsByEnv(env, analyze),
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        symlinks: false,
    },
    stats: analyze ? "none" : stats,
});
