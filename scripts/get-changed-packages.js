#!/usr/bin/env node

/**
 * The purpose of this script is to output one or many `--scope=<package_name>` CLI args that can be passed
 * directly to `lerna run <script_name>`. E.g.: `lerna run lint $(./scripts/get-changed-packages.js)`
 */

"use-strict";

const childProcess = require("child_process");
const os = require("os");
const path = require("path");

const NODE_MODULES_BIN = path.resolve(__dirname, "../", "node_modules/.bin");

const changedPackages = childProcess.execSync("lerna changed --loglevel error", {
    encoding: "utf8",
    env: Object.assign({},  process.env, { PATH: `${NODE_MODULES_BIN}:${process.env.PATH}`})
});

const scopeCliArg = changedPackages.split(os.EOL)
    .filter((changedPackage) => !!changedPackage)
    .map((changedPackage) => `--scope=${changedPackage}`)
    .join(" ");

// write result to stdout so that it can be easily given to a commandline tool
process.stdout.write(scopeCliArg.trim());
