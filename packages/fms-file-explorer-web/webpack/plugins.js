const path = require('path');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require('webpack');
const WorkerPlugin = require('worker-plugin');

const Env = require('./constants').Env;

const BASE_PLUGINS = [
    new ForkTsCheckerWebpackPlugin({
        tsconfig: path.resolve(__dirname, '../', 'tsconfig.json'),
        workers: ForkTsCheckerWebpackPlugin.ONE_CPU,
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({ filename: 'style.[contenthash].css' }),
    new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'index.html')
    }),
    new WorkerPlugin({
        globalObject: "self", // apparently needed for HMR support
    }),
];

const BUNDLE_ANALYZER = [new BundleAnalyzerPlugin({ analyzerMode: 'static' })];

const PLUGINS_BY_ENV = {
    [Env.PRODUCTION]: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
        new webpack.HashedModuleIdsPlugin()
    ],
    [Env.STAGE]: [
        new webpack.NamedModulesPlugin()
    ]
};

module.exports = (env, analyzer) => [
    ...BASE_PLUGINS,
    ...(analyzer ? BUNDLE_ANALYZER : []),
    ...(PLUGINS_BY_ENV[env] || [])
];
