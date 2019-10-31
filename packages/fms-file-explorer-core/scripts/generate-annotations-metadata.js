"use strict";

const path = require("path");

const {
    ensureAssetsDirExists,
    makeSuccessResponse,
    MOCK_DATA_DIR,
    writeOutputToFile,
} = require("./mock-data-helpers");

console.log("Generating annotations metadata");
ensureAssetsDirExists();

const annotations = [
    {
        annotation_id: 1,
        annotation_display_name: "Date created",
        annotation_name: "created",
        description: "Date and time file was created",
        type: "date/time",
    },
    {
        annotation_id: 2,
        annotation_display_name: "Created by",
        annotation_name: "created_by",
        description: "Person who produced the file",
        type: "string",
    },
    {
        annotation_id: 3,
        annotation_display_name: "File name",
        annotation_name: "file_name",
        description: "Name of file",
        type: "string",
    },
    {
        annotation_id: 4,
        annotation_display_name: "Size",
        annotation_name: "file_size",
        description: "Size of file on disk",
        type: "number",
        units: "bytes",
    },
    {
        annotation_id: 5,
        annotation_display_name: "Cell line",
        annotation_name: "cell_line",
        description: "AICS cell line",
        type: "string",
    },
    {
        annotation_id: 6,
        annotation_display_name: "Cells are dead",
        annotation_name: "cell_dead",
        description: "Does this field contain dead cells",
        type: "boolean",
    },
    {
        annotation_id: 7,
        annotation_display_name: "Is matrigel hard?",
        annotation_name: "matrigel_hardened",
        description: "Whether or not matrigel is hard.",
        type: "boolean",
    },
    {
        annotation_id: 8,
        annotation_display_name: "Average cell width",
        annotation_name: "avg_cell_width",
        description: "Average modeled width of cell in given 3D block",
        type: "number",
        units: "um",
    }
];

writeOutputToFile(path.join(MOCK_DATA_DIR, "annotations.json"), makeSuccessResponse(annotations));
