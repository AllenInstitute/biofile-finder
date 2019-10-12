#!/usr/bin/env node

/**
 * CLI to generate arbitrary data of the shape expected to be returned by a future FMS File Explorer Query Service.
 */

"use-strict";

const fs = require("fs");
const path = require("path");

const lodash = require('lodash');

const MOCK_DATA_DIR = path.resolve(__dirname, "..", "assets");

/**
 * Creates one filtered projection of a document that will live in a Mongo collection.
 */
function makeFileDatum(index) {
    return {
        file_id: lodash.uniqueId(),
    }
}

/**
 * Intended to have same contract as https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/api-response-java/browse/src/main/java/org/alleninstitute/aics/response/SuccessResponse.java
 */
function makeSuccessResponse(data, totalCount = data.length, hasMore = false, offset = 0) {
    return {
        data,
        hasMore,
        offset,
        responseType: "SUCCESS",
        totalCount,
    };
}

const dataPages = [
    { baseName: "data", size: 100000, pageSize: 20000 },
];

dataPages.forEach((dataPage) => {
    console.log(`Generating data for ${dataPage.baseName}`);
    const data = [];
    for (let i = 0; i < dataPage.size; i++) {
        data.push(makeFileDatum(i));
    }

    const chunks = lodash.chunk(data, dataPage.pageSize);
    chunks.forEach((dataChunk, pageIndex) => {
        const outfileName = `${dataPage.baseName}-${pageIndex}.json`;
        const outfile = `${MOCK_DATA_DIR}/${outfileName}`;
        const offset = pageIndex * dataPage.pageSize;  // in this formulation, offset === number of rows to skip to get to current result set

        console.log(`Writing ${dataChunk.length} data to ${outfile}`);

        const contents = makeSuccessResponse(dataChunk, dataPage.size, dataPage.size > dataChunk.length + offset, offset);
        fs.writeFile(outfile, JSON.stringify(contents, null, 2), (err) => {
            if (err) {
                console.error(`Failed to write ${outfile}`);
                return;
            }

            console.log(`Wrote ${outfile}`);
        });
    });
});
