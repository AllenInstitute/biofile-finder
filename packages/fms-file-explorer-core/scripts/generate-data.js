#!/usr/bin/env node

/**
 * Generate mock data of the shape expected to be returned by a future FMS File Explorer Query Service.
 *
 * This is a temporary script intended to get development of the frontend moving and determine data requirements.
 */

"use-strict";

const fs = require("fs");
const path = require("path");

const lodash = require('lodash');

const TOTAL_DATA_SIZE = 100000;
const DATA_PAGE_SIZE = 10000;
const MOCK_DATA_DIR = path.resolve(__dirname, "..", "assets");
const FILE_EXTENSIONS = ["czi", "ome.tiff", "tiff", "png", "bam"];
const EARLIEST_CREATED_ON_DATE = new Date("01 Jan 2017 00:00:00 UTC");

/**
 * Creates one filtered projection of a document that will live in a Mongo collection.
 */
function makeFileDatum(index) {
    // grab random extension out of FILE_EXTENSIONS
    const ext = FILE_EXTENSIONS[Math.round(Math.random() * (FILE_EXTENSIONS.length - 1))];

    return {
        created: new Date(Number(EARLIEST_CREATED_ON_DATE) + Math.random() * (Date.now() - EARLIEST_CREATED_ON_DATE)),
        // eslint-disable-next-line @typescript-eslint/camelcase
        file_id: lodash.uniqueId(),
        // eslint-disable-next-line @typescript-eslint/camelcase
        file_name: `file-${index}.${ext}`,
    };
}

/**
 * Intended to have same contract as https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/api-response-java/browse/src/main/java/org/alleninstitute/aics/response/SuccessResponse.java
 */
function makeSuccessResponse(data, hasMore = false, offset = 0) {
    return {
        data,
        hasMore,
        offset,
        responseType: "SUCCESS",
        totalCount: TOTAL_DATA_SIZE,
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

console.log("Generating data");
const data = [];
for (let i = 0; i < TOTAL_DATA_SIZE; i++) {
    data.push(makeFileDatum(i));
}

// paginate by splitting the data into chunks of size DATA_PAGE_SIZE
// save each page into its own json file
const pages = lodash.chunk(data, DATA_PAGE_SIZE);
pages.forEach((page, pageIndex) => {
    const outfileName = `data-${pageIndex}.json`;
    const outfile = `${MOCK_DATA_DIR}/${outfileName}`;
    const offset = pageIndex * DATA_PAGE_SIZE;  // offset === number of rows to skip to get to current result set

    console.log(`Writing ${page.length} datum to ${outfile}`);

    const contents = makeSuccessResponse(page, TOTAL_DATA_SIZE > page.length + offset, offset);
    fs.writeFile(outfile, JSON.stringify(contents, null, 2), (err) => {
        if (err) {
            console.error(`Failed to write ${outfile}`);
            throw err;
        }

        console.log(`Wrote ${outfile}`);
    });
});
