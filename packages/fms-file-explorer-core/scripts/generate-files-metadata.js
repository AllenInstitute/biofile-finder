"use-strict";

/**
 * Generate mock data of the shape expected to be returned by a future FMS File Explorer Query Service.
 *
 * This is a temporary script intended to get development of the frontend moving and determine data requirements.
 */

const path = require("path");

const {
    ensureAssetsDirExists,
    makeSuccessResponse,
    MOCK_DATA_DIR,
    writeOutputToFile,
} = require("./mock-data-helpers");

const lodash = require('lodash');

const TOTAL_DATA_SIZE = 10000;
const DATA_PAGE_SIZE = TOTAL_DATA_SIZE; // GM 10/18/2019 turn off pagination until we need it

const FILE_EXTENSIONS = ["czi", "ome.tiff", "tiff", "png", "bam"];
const EARLIEST_CREATED_ON_DATE = new Date("01 Jan 2017 00:00:00 UTC");
const DATA_PRODUCERS = ["Daffy Duck", "Donald Duck", "Dalia Duck", "Daphnie Duck", "Dornelius Duder Dunder Doodle Duck"];

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;
const GIGABYTE = MEGABYTE * KILOBYTE;
const TERABYTE = GIGABYTE * KILOBYTE;
const MAX_FILE_SIZE = TERABYTE;  // need upper bound only for fake data generation; not a real limit on data this application can work with

/**
 * Creates one filtered projection of a document that will live in a Mongo collection.
 */
function makeFileDatum(index) {
    // grab random extension out of FILE_EXTENSIONS
    const ext = FILE_EXTENSIONS[Math.round(Math.random() * (FILE_EXTENSIONS.length - 1))];

    return {
        created: new Date(Number(EARLIEST_CREATED_ON_DATE) + Math.random() * (Date.now() - EARLIEST_CREATED_ON_DATE)),
        "created_by": DATA_PRODUCERS[Math.round(Math.random() * (DATA_PRODUCERS.length - 1))],
        "file_id": lodash.uniqueId(),
        "file_index": index,
        "file_name": `file-${index}.${ext}`,
        "file_size": Math.floor(Math.random() * MAX_FILE_SIZE),
    };
}

console.log("Generating files metadata");
ensureAssetsDirExists();

const data = [];
for (let i = 0; i < TOTAL_DATA_SIZE; i++) {
    data.push(makeFileDatum(i));
}

// paginate by splitting the data into chunks of size DATA_PAGE_SIZE
// save each page into its own json file
const pages = lodash.chunk(data, DATA_PAGE_SIZE);
pages.forEach((page, pageIndex) => {
    const outfile = path.join(MOCK_DATA_DIR, `data-${pageIndex}.json`);
    const offset = pageIndex * DATA_PAGE_SIZE;  // offset === number of rows to skip to get to current result set

    console.log(`Writing ${page.length} datum to ${outfile}`);
    const contents = makeSuccessResponse(page, TOTAL_DATA_SIZE > page.length + offset, offset, TOTAL_DATA_SIZE);
    writeOutputToFile(outfile, contents);
});
