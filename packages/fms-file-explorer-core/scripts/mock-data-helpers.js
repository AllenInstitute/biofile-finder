"use-strict";

const fs = require("fs");
const path = require("path");

const MOCK_DATA_DIR = path.resolve(__dirname, "..", "assets");
exports.MOCK_DATA_DIR = MOCK_DATA_DIR;

exports.ensureAssetsDirExists = () => {
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
};

exports.generateDate = (earliest = new Date("01 Jan 2017 00:00:00 UTC"), latest = Date.now()) => {
    return new Date(Number(earliest) + Math.random() * (latest - earliest));
}

/**
 * Intended to have same contract as https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/api-response-java/browse/src/main/java/org/alleninstitute/aics/response/SuccessResponse.java
 */
exports.makeSuccessResponse = (data, hasMore = false, offset = 0, totalCount = data.length) => {
    return {
        data,
        hasMore,
        offset,
        responseType: "SUCCESS",
        totalCount,
    };
};

exports.randomItemFrom = (list = []) => {
    return list[Math.round(Math.random() * (list.length - 1))];
};

exports.writeOutputToFile = (outfile, contents) => {
    fs.writeFile(outfile, JSON.stringify(contents, null, 2), (err) => {
        if (err) {
            console.error(`Failed to write ${outfile}`);
            throw err;
        }

        console.log(`Wrote ${outfile}`);
    });
};
