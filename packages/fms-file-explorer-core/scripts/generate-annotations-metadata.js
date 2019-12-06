"use strict";

const path = require("path");

const d3Random = require("d3-random");
const { noop, pick, uniq, uniqueId } = require("lodash");

const {
    AICSIpsum,
    ensureDirExists,
    FILE_EXTENSIONS,
    generateDate,
    makeSuccessResponse,
    MOCK_DATA_DIR,
    randomItemFrom,
    SCIENTISTS,
    writeOutputToFile,
} = require("./mock-data-helpers");
const { TOTAL_DATA_SIZE, MAX_FILE_SIZE } = require("./generate-files-metadata");

console.log("Generating annotations metadata");

const ANNOTATION_VALUES_DIR = path.resolve(MOCK_DATA_DIR, "annotation-values");
ensureDirExists(MOCK_DATA_DIR);
ensureDirExists(ANNOTATION_VALUES_DIR);

// Generator to randomly determine how many annotation values should be created for any given annotation. Samples from a Gaussian distribution.
// Bulk of values generated will be between 12 - 18.
const numAnnotationsGenerator = d3Random.randomNormal(15, 3);

// Very rough and probably incorrect model for
// https://cfe.allencell.org/?plotByOnX=Cellular%20Volume%20%28fL%29&plotByOnY=Cellular%20Volume%20%28fL%29
const avgCellVolumeGenerator = d3Random.randomLogNormal(Math.log(3000), 0.5);

const booleanValueGenerator = () => {
    // Let's assume that ~80% of the time, a boolean annotation will have both true and false values recorded for it in the DB.
    // The other ~20% of the time, maybe it only has one of (true|false) as a unique value.
    const random = Math.random();
    const includeBothTrueAndFalse = random >= 0.2;
    if (includeBothTrueAndFalse) {
        return [true, false];
    } else {
        const zeroOrOne = Math.round(random);
        return [[true, false][zeroOrOne]];
    }
}

const annotations = exports.annotations = [
    {
        annotation_id: 1,
        annotation_display_name: "Date created",
        annotation_name: "created",
        description: "Date and time file was created",
        type: "date/time",
        valueGenerator() {
            return Array.from({ length: numAnnotationsGenerator() }, generateDate);
        }
    },
    {
        annotation_id: 2,
        annotation_display_name: "Created by",
        annotation_name: "created_by",
        description: "Person who produced the file",
        type: "string",
        valueGenerator() {
            return uniq(Array.from({ length: numAnnotationsGenerator() }, () => randomItemFrom(SCIENTISTS)));
        }
    },
    {
        annotation_id: 3,
        annotation_display_name: "File name",
        annotation_name: "file_name",
        description: "Name of file",
        type: "string",
        valueGenerator() {
            return Array.from({ length: TOTAL_DATA_SIZE }, () => `file-${uniqueId()}.${randomItemFrom(FILE_EXTENSIONS)}`);
        }
    },
    {
        annotation_id: 4,
        annotation_display_name: "Size",
        annotation_name: "file_size",
        description: "Size of file on disk",
        type: "number",
        units: "bytes",
        valueGenerator() {
            return Array.from({ length: TOTAL_DATA_SIZE }, () => Math.floor(Math.random() * MAX_FILE_SIZE));
        }
    },
    {
        annotation_id: 5,
        annotation_display_name: "Cell line",
        annotation_name: "cell_line",
        description: "AICS cell line",
        type: "string",
        valueGenerator() {
            return uniq(Array.from({ length: numAnnotationsGenerator() }, AICSIpsum));
        }
    },
    {
        annotation_id: 6,
        annotation_display_name: "Cells are dead",
        annotation_name: "cell_dead",
        description: "Does this field contain dead cells",
        type: "boolean",
        valueGenerator: booleanValueGenerator,
    },
    {
        annotation_id: 7,
        annotation_display_name: "Is matrigel hard?",
        annotation_name: "matrigel_hardened",
        description: "Whether or not matrigel is hard.",
        type: "boolean",
        valueGenerator: booleanValueGenerator,
    },
    {
        annotation_id: 8,
        annotation_display_name: "Average cell volume",
        annotation_name: "avg_cell_volume",
        description: "Average modeled volume of cell",
        type: "number",
        units: "um",
        valueGenerator: () => {
            return Array.from({ length: numAnnotationsGenerator() }, () => Math.round(avgCellVolumeGenerator()));
        },
    }
];

function generateListOfUniqueAnnotations() {
    const values = annotations.map((annotation) => pick(annotation, [
        "annotation_id",
        "annotation_display_name",
        "annotation_name",
        "description",
        "type"
    ]));
    writeOutputToFile(path.join(MOCK_DATA_DIR, "annotations.json"), makeSuccessResponse(values));
}

function generateValuesForEachAnnotation() {
    annotations.forEach((annotation) => {
        const outpath = path.join(ANNOTATION_VALUES_DIR, `${annotation.annotation_name}.json`);
        writeOutputToFile(outpath, makeSuccessResponse((annotation.valueGenerator || noop)()));
    });
}

if (require.main === module) {
    generateListOfUniqueAnnotations();
    generateValuesForEachAnnotation();
}
