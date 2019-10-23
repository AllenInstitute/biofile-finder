"use strict";

const fs = require("fs");
const path = require("path");

const MOCK_DATA_DIR = path.resolve(__dirname, "..", "assets");

/**
 * Intended to have same contract as https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/api-response-java/browse/src/main/java/org/alleninstitute/aics/response/SuccessResponse.java
 */
function makeSuccessResponse(data, hasMore = false, offset = 0) {
    return {
        data,
        hasMore,
        offset,
        responseType: "SUCCESS",
        totalCount: data.length,
    };
}

// ensure assets directory exists
try {
    fs.accessSync(MOCK_DATA_DIR, fs.constants.F_OK)
} catch (err) {
    if (err.code === "ENOENT") {
        console.log(`${MOCK_DATA_DIR} does not exist yet -- creating`);
        fs.mkdirSync(MOCK_DATA_DIR);
    } else {
        throw err;
    }
}

console.log("Generating annotations metadata");

const annotations = [
    {"annotation_name": "file_name", description: "Name of file", type: "string"},
    {"annotation_name": "created", description: "Date and time file was created", type: "date/time"},
    {"annotation_name": "file_size", description: "Size of file on disk", type: "number", unit: "bytes"}
];

const contents = makeSuccessResponse(annotations);
const outfile = "annotations.json";
fs.writeFile(outfile, JSON.stringify(contents, null, 2), (err) => {
    if (err) {
        console.error(`Failed to write ${outfile}`);
        throw err;
    }

    console.log(`Wrote ${outfile}`);
});
