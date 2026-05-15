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
    ],
};
