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
        "annotation_display_name": "Date created",
        "annotation_name": "created",
        description: "Date and time file was created",
        type: "date/time",
    },
    {
        "annotation_display_name": "Created by",
        "annotation_name": "created_by",
        description: "Person who produced the file",
        type: "string",
    },
    {
        "annotation_display_name": "File name",
        "annotation_name": "file_name",
        description: "Name of file",
        type: "string",
    },
    {
        "annotation_display_name": "Size",
        "annotation_name": "file_size",
        description: "Size of file on disk",
        type: "number",
        unit: "bytes",
    }
];

writeOutputToFile(path.join(MOCK_DATA_DIR, "annotations.json"), makeSuccessResponse(annotations));
