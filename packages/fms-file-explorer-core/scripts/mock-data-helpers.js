"use-strict";

const fs = require("fs");
const path = require("path");

const { shuffle } = require("lodash");

const MOCK_DATA_DIR = path.resolve(__dirname, "..", "assets");
exports.MOCK_DATA_DIR = MOCK_DATA_DIR;

function ensureDirExists(dir) {
    try {
        fs.accessSync(dir, fs.constants.F_OK);
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log(`${dir} does not exist yet -- creating`);
            fs.mkdirSync(dir);
        } else {
            throw err;
        }
    }
}
exports.ensureDirExists = ensureDirExists;

exports.FILE_EXTENSIONS = ["czi", "ome.tiff", "tiff", "png", "bam", "mov"];

function generateDate(earliest = new Date("01 Jan 2017 00:00:00 UTC"), latest = Date.now()) {
    return new Date(Number(earliest) + Math.random() * (latest - earliest));
}
exports.generateDate = generateDate;

/**
 * Intended to have same contract as https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/api-response-java/browse/src/main/java/org/alleninstitute/aics/response/SuccessResponse.java
 */
function makeSuccessResponse(data = [], hasMore = false, offset = 0, totalCount = data.length) {
    return {
        data,
        hasMore,
        offset,
        responseType: "SUCCESS",
        totalCount,
    };
}
exports.makeSuccessResponse = makeSuccessResponse;

function randomItemFrom(list = []) {
    return list[Math.round(Math.random() * (list.length - 1))];
}
exports.randomItemFrom = randomItemFrom;

exports.SCIENTISTS = [
    "Monica Geller",
    "Ross Geller",
    "Rachel Green",
    "Phoebe Buffay",
    "Joey Tribbiani",
    "Chandler Bing",
];

function writeOutputToFile(outfile, contents) {
    fs.writeFile(outfile, JSON.stringify(contents, null, 2), (err) => {
        if (err) {
            console.error(`Failed to write ${outfile}`);
            throw err;
        }

        console.log(`Wrote ${outfile}`);
    });
}
exports.writeOutputToFile = writeOutputToFile;

function AICSIpsum() {
    const words = shuffle([
        'AdditionalWorkup',
        'Cardios',
        'Dyes',
        'ImmunoFluorescence',
        'MicroscopeTesting',
        'Minipipeline',
        'Phototox',
        'Screen-Clones',
        'Screen-MixedPop',
        'Transfection',
        'Force Based Assay',
        'CardiosMinipipeline',
        'CardiosPatterning',
        'ACTB',
        'ACTN1',
        'Segmentation',
        'ACTN2',
        'ATP2A2',
        'CETN2',
        'CTNNA1',
        'CTNNB1',
        'DSP',
        'beta-galactoside alpha-2,6-sialyltransferase 1',
        'centrin 2',
        'connexin 43',
        'cytoplasmic GFP',
        'desmoplakin',
        'fibrillarin',
        'galactose-1-phosphate uridylyltransferase',
        'isocitrate dehydrogenase',
        'lamin B1',
        'FBL',
        'GALT',
        'GJA1',
        'IDH3G',
        'LAMP1',
        'LMNB1',
        'Smart goals',
        'LMNB1/TUBA1B',
        'MAP1LC3B',
        'MYH10',
        'MYL2',
        'MYL7',
        'iPSC',
        'cardiomyocyte',
        'organoid-kidney',
        'PMP34',
        'PXN',
        'SEC61B',
        'SEC61B/LMNB1',
        'SEC61B/TUBA1B',
        'SLC25A17',
        'ST6GAL1',
        'TJP1',
    ]);

    return randomItemFrom(words);
}
exports.AICSIpsum = AICSIpsum;