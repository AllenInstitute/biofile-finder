// Hardcoded pipeline and parameter data standing in for FSS GET /pipelines and
// GET /pipelines/:id/parameters. Replace the contents of this file once the real
// endpoints are available.

import { Pipeline, PipelineParameter } from "../../entity/ComputePipeline";

export const MOCK_PIPELINES: Pipeline[] = [
    {
        id: "all-cells-mask",
        name: "All Cells Mask Segmentation",
        description:
            "The All Cells Mask workflow generates segmentation masks for the selected files. After submission, you can monitor progress in the job dashboard.",
        restrictions: "Works only with multi-scene Tiff and CZI files.",
        clusters: ["slurm-prod"],
        acceptedExtensions: ["czi"],
        maxFileSizeBytes: 107374182400,
    },
    {
        id: "zarr-conversion",
        name: "BioIO OME Zarr Conversion",
        description: "Converts microscopy images to OME-Zarr format.",
        restrictions: null,
        clusters: ["slurm-prod"],
        acceptedExtensions: ["czi", "tif", "tiff", "nd2"],
        maxFileSizeBytes: null,
    },
];

export const MOCK_PARAMETERS: Record<string, PipelineParameter[]> = {
    "all-cells-mask": [
        {
            name: "file_paths",
            label: "File Paths",
            description: "VAST paths of files to process.",
            type: "file_paths",
            required: true,
            default: null,
            validation: {},
        },
        {
            name: "scene",
            label: "Scene Index",
            description: "Scene index for multi-scene CZI files.",
            type: "number",
            required: false,
            default: 0,
            validation: { min: 0 },
        },
        {
            name: "channel",
            label: "Channel",
            description: "Channel index.",
            type: "number",
            required: false,
            default: 0,
            validation: { min: 0 },
        },
    ],
    "zarr-conversion": [
        {
            name: "file_paths",
            label: "File Paths",
            description: "VAST paths of files to convert.",
            type: "file_paths",
            required: true,
            default: null,
            validation: {},
        },
        {
            name: "scenes",
            label: "Scenes",
            description:
                "Comma-separated scene indices to export (e.g. '0,2'). Leave blank to export all scenes.",
            type: "string",
            required: false,
            default: null,
            validation: { pattern: "^[0-9]+(,[0-9]+)*$" },
        },
        {
            name: "num_levels",
            label: "Pyramid Levels",
            description: "Number of resolution levels to generate. 1 means no downsampling.",
            type: "number",
            required: false,
            default: 1,
            validation: { min: 1 },
        },
        // {
        //     name: "downsample_z",
        //     label: "Downsample Z",
        //     description:
        //         "Also halve the Z dimension at each pyramid level. Only applies when Pyramid Levels > 1.",
        //     type: "boolean",
        //     required: false,
        //     default: false,
        //     validation: {},
        // },
        // {
        //     name: "dtype",
        //     label: "Output Data Type",
        //     description:
        //         "Override the output data type. Leave blank to use the file's native type.",
        //     type: "select",
        //     required: false,
        //     default: null,
        //     options: ["uint8", "uint16", "uint32", "float32", "float64"],
        //     validation: {},
        // },
        // {
        //     name: "zarr_format",
        //     label: "Zarr Format",
        //     description: "Zarr version to write. v3 is recommended.",
        //     type: "select",
        //     required: false,
        //     default: "3",
        //     options: ["2", "3"],
        //     validation: {},
        // },
        // {
        //     name: "tbatch",
        //     label: "Timepoint Batch Size",
        //     description:
        //         "Number of timepoints to process per batch. Reduce if running out of memory on large time series.",
        //     type: "number",
        //     required: false,
        //     default: null,
        //     validation: { min: 1 },
        // },
    ],
};
