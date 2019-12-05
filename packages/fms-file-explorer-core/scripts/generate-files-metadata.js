"use-strict";

/**
 * Generate mock data of the shape expected to be returned by a future FMS File Explorer Query Service.
 * Expected endpoint: `api/{version}/file`
 *
 * This is a temporary script intended to get development of the frontend moving and determine data requirements.
 */

const path = require("path");

const lodash = require('lodash');

const {
    ensureAssetsDirExists,
    generateDate,
    makeSuccessResponse,
    MOCK_DATA_DIR,
    randomItemFrom,
    writeOutputToFile,
} = require("./mock-data-helpers");

const TOTAL_DATA_SIZE = exports.TOTAL_DATA_SIZE = 100000;
const FILES_METADATA_OUTFILE = exports.FILES_METADATA_OUTFILE = path.join(MOCK_DATA_DIR, "files.json");

const FILE_EXTENSIONS = ["czi", "ome.tiff", "tiff", "png", "bam"];
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
    return {
        created: generateDate(),
        "created_by": randomItemFrom(DATA_PRODUCERS),
        "file_id": lodash.uniqueId(),
        "file_index": index,
        "file_name": `file-${index}.${randomItemFrom(FILE_EXTENSIONS)}`,
        "file_size": Math.floor(Math.random() * MAX_FILE_SIZE),
    };
}

function main() {
    console.log("Generating files metadata");
    ensureAssetsDirExists();

    const data = [];
    for (let i = 0; i < TOTAL_DATA_SIZE; i++) {
        data.push(makeFileDatum(i));
    }

    console.log(`Writing ${data.length} datum to ${FILES_METADATA_OUTFILE}`);
    const contents = makeSuccessResponse(data);
    writeOutputToFile(FILES_METADATA_OUTFILE, contents);
}

if (require.main === module) {
    main();
}
