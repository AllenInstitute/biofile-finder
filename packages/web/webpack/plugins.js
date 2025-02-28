const path = require("path");

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

const Env = require("./constants").Env;
const packageJson = require("../package.json");

const BASE_PLUGINS = [
    new ForkTsCheckerWebpackPlugin({
        typescript: {
            configFile: path.resolve(__dirname, "..", "..", "..", "tsconfig.json"),
        },
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" }),
    new HtmlWebpackPlugin({
        favicon: path.resolve(__dirname, "logo.ico"),
        template: path.resolve(__dirname, "index.html"),
    }),
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
        const mod = resource.request.replace(/^node:/, "");
        switch (mod) {
            case "assert":
                resource.request = "assert";
                break;
            default:
                throw new Error(`Not found ${mod}`);
        }
    }),
];

const BUNDLE_ANALYZER = [new BundleAnalyzerPlugin({ analyzerMode: "static" })];

const PLUGINS_BY_ENV = {
    [Env.PRODUCTION]: [
        new webpack.DefinePlugin({
            "process.env.APPLICATION_VERSION": JSON.stringify(packageJson.version),
            "process.env.NODE_ENV": JSON.stringify("production"),
        }),
    ],
    [Env.DEVELOPMENT]: [
        new webpack.DefinePlugin({
            "process.env.APPLICATION_VERSION": JSON.stringify(packageJson.version),
            "process.env.NODE_ENV": JSON.stringify("development"),
        }),
    ],
};

module.exports = (isProduction, analyzer) => [
    ...BASE_PLUGINS,
    ...(analyzer ? BUNDLE_ANALYZER : []),
    ...(isProduction ? PLUGINS_BY_ENV[Env.PRODUCTION] : PLUGINS_BY_ENV[Env.DEVELOPMENT]),
];
