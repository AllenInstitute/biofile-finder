"use-strict";

/**
 * Generate mock data of the shape expected to be returned by a future FMS File Explorer Query Service.
 *
 * This is a temporary script intended to get development of the frontend moving and determine data requirements.
 */

const { promises: fsPromises } = require("fs");
const path = require("path");

const lodash = require("lodash");

const {
    ensureAssetsDirExists,
    makeSuccessResponse,
    MOCK_DATA_DIR,
    writeOutputToFile,
} = require("./mock-data-helpers");

const { FILES_METADATA_OUTFILE, TOTAL_DATA_SIZE } = require("./generate-files-metadata");

const DATA_PAGE_SIZE = 10000;

console.log("Generating lists of file_ids");
ensureAssetsDirExists();

const data = [];

fsPromises.readFile(FILES_METADATA_OUTFILE, { encoding: "UTF-8" })
    .then((files) => {
       JSON.parse(files).data.forEach((file) => {
           data.push(`${file["file_id"]}`);
       });
    })
    .then(() => {
        // paginate by splitting the data into chunks of size DATA_PAGE_SIZE
        // save each page into its own json file
        const pages = lodash.chunk(data, DATA_PAGE_SIZE);
        pages.forEach((page, pageIndex) => {
            const outfile = path.join(MOCK_DATA_DIR, `file-ids-${pageIndex}.json`);
            const offset = pageIndex * DATA_PAGE_SIZE;  // offset === number of rows to skip to get to current result set

            const contents = makeSuccessResponse(page, TOTAL_DATA_SIZE > page.length + offset, offset, TOTAL_DATA_SIZE);
            writeOutputToFile(outfile, contents);
        });
    })
    .catch((err) => {
        throw err;
    });
