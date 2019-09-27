"use-strict";

const childProcess = require("child_process");
const path = require("path");

const packageJson = require("../package.json");

const { archiveName, archiveVersion } = require("./package-for-publish");

const url = `https://artifactory.corp.alleninstitute.org/artifactory/maven-snapshot-local/org/alleninstitute/aics/${packageJson.name}/${archiveVersion}/${archiveName}`;

childProcess.execFile("curl", [
    "-H", `"X-JFrog-Art-Api: ${process.env.ARTIFACTORY_API_KEY}"`,
    "-T", path.resolve(__dirname, "../", archiveName),
    "-X", "PUT",
    "--fail",
    url
], (error, stdout, stderr) => {
    if (error) {
        console.error(`Failed to PUT ${archiveName} into Artifactory`);
        console.error(error);
        console.error(stderr);
    } else {
        console.log(`Successfully PUT ${archiveName} into Artifactory`);
        console.log(stdout);
    }
});