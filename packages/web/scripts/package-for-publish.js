#!/usr/bin/env node

"use-strict";

const childProcess = require("child_process");
const { promises: fsPromises } = require("fs");

const packageJson = require("../package.json");

function gitBranchName() {
    const branch = childProcess.execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
    });
    return branch.trim();
}

const gitBranch = gitBranchName();
const archiveVersion = (exports.archiveVersion =
    gitBranch !== "master" ? gitBranch.split("/").join("-") : packageJson.version);
const archiveName = (exports.archiveName = `${packageJson.name}-${archiveVersion}.tgz`);

// get list of files in dist/, then package in a tar bundle
function main() {
    fsPromises.readdir("dist").then((fileList) => {
        childProcess.exec(
            `tar -czf ${archiveName} -C dist ${fileList.join(" ")}`,
            (err, stdout, stderr) => {
                if (err) {
                    console.error("Failed to package dist/ for publishing\n", stderr, err);
                } else {
                    console.log("Successfully packaged dist/ for publishing");
                }
            }
        );
    });
}

// only run main if called from the commandline (e.g., node ./scripts/package-for-publish.js)
if (require.main === module) {
    main();
}
