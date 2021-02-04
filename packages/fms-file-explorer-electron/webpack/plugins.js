const path = require("path");

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

const Env = require("./constants").Env;
const devServer = require("./constants").devServer;
const packageJson = require("../package.json");

const BASE_PLUGINS = [
    new ForkTsCheckerWebpackPlugin({
        tsconfig: path.resolve(__dirname, "../", "tsconfig.json"),
        workers: ForkTsCheckerWebpackPlugin.ONE_CPU,
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({ filename: "style.[contenthash].css" }),
    new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "index.html"),
    }),
    new Dotenv({
        systemvars: true, // load all system variables in addition to what we find in .env
    }),
];

const BUNDLE_ANALYZER = [new BundleAnalyzerPlugin({ analyzerMode: "static" })];

const PLUGINS_BY_ENV = {
    [Env.PRODUCTION]: [
        new webpack.DefinePlugin({
            "process.env.APPLICATION_VERSION": JSON.stringify(packageJson.version),
            "process.env.NODE_ENV": JSON.stringify("production"),
        }),
        new webpack.HashedModuleIdsPlugin(),
    ],
    [Env.DEVELOPMENT]: [
        new webpack.DefinePlugin({
            "process.env.APPLICATION_VERSION": JSON.stringify(packageJson.version),
            "process.env.NODE_ENV": JSON.stringify("development"),
            "process.env.WEBPACK_DEV_SERVER_PORT": JSON.stringify(devServer.port),
        }),
    ],
};

module.exports = (env, analyzer) => [
    ...BASE_PLUGINS,
    ...(analyzer ? BUNDLE_ANALYZER : []),
    ...(PLUGINS_BY_ENV[env] || []),
];
