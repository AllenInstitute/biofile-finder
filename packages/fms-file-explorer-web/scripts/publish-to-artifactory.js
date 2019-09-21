"use-strict";

const fs = require("fs");
const https = require("https");

const packageJson = require("../package.json");

const { archiveName, archiveVersion } = require("./package-for-publish");

const CAs = [
    fs.readFileSync("/etc/ssl/certs/aics-ca.pem"),
    fs.readFileSync("/etc/ssl/certs/AibsIssuingCA-20220124.pem"),
    fs.readFileSync("/etc/ssl/certs/AibsRootCA-20220124.pem")
];

const requestConfig = {
    ca: CAs,
    hostname: "artifactory.corp.alleninstitute.org",
    method: "PUT",
    path: `artifactory/maven-snapshot-local/org/alleninstitute/aics/${packageJson.name}/${archiveVersion}/${archiveName}`
};

requestConfig.agent = new https.Agent(requestConfig);

const req = https.request(requestConfig, (res) => {
    if (res.statusCode !== 200) {
        console.warn(`Received non-200 OK response from attempt to PUT ${archiveName} into Artifactory`);
    } else {
        console.log(`Successfully PUT ${archiveName} into Artifactory`);
    }

    res.on("data", (data) => {
        process.stdout.write(data);
    });
});

req.on("error", (err) => {
    console.error(err);
});

req.end();
