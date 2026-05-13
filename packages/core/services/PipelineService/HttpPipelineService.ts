import {
    ComputeTaskRequest,
    ComputeTaskResponse,
    Pipeline,
    PipelineParameter,
} from "../../entity/ComputePipeline";
import PipelineService from ".";

// TODO: replace with the real FSS base URL once endpoints are available
const _BASE_URL = "";

// Hardcoded until FSS GET /pipelines is available
const PIPELINES: Pipeline[] = [
    {
        id: "all-cells-mask-segmentation",
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

// Hardcoded until FSS GET /parameters is available
const PARAMETERS: Record<string, PipelineParameter[]> = {
    "all-cells-mask-segmentation": [
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
            name: "brightfield_channel",
            label: "Brightfield Channel",
            description: "Channel index for brightfield.",
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
        {
            name: "downsample_z",
            label: "Downsample Z",
            description:
                "Also halve the Z dimension at each pyramid level. Only applies when Pyramid Levels > 1.",
            type: "boolean",
            required: false,
            default: false,
            validation: {},
        },
        {
            name: "dtype",
            label: "Output Data Type",
            description:
                "Override the output data type. Leave blank to use the file's native type.",
            type: "select",
            required: false,
            default: null,
            options: ["uint8", "uint16", "uint32", "float32", "float64"],
            validation: {},
        },
        {
            name: "zarr_format",
            label: "Zarr Format",
            description: "Zarr version to write. v3 is recommended.",
            type: "select",
            required: false,
            default: "3",
            options: ["2", "3"],
            validation: {},
        },
        {
            name: "tbatch",
            label: "Timepoint Batch Size",
            description:
                "Number of timepoints to process per batch. Reduce if running out of memory on large time series.",
            type: "number",
            required: false,
            default: null,
            validation: { min: 1 },
        },
    ],
};

export default class HttpPipelineService implements PipelineService {
    getPipelines(): Promise<Pipeline[]> {
        // TODO: return fetch(`\${_BASE_URL}/pipelines`).then((r) => r.json());
        return Promise.resolve(PIPELINES);
    }

    getParameters(pipelineId: string, _cluster: string): Promise<PipelineParameter[]> {
        // TODO: return fetch(`\${_BASE_URL}/pipelines/${pipelineId}/parameters?cluster=${_cluster}`).then((r) => r.json());
        const params = PARAMETERS[pipelineId];
        if (!params) {
            return Promise.reject(new Error(`No parameters found for pipeline: ${pipelineId}`));
        }
        return Promise.resolve(params);
    }

    submitComputeTask(request: ComputeTaskRequest): Promise<ComputeTaskResponse> {
        // TODO: replace with real HTTP call once FSS POST /compute-tasks is available:
        // return fetch(`\${_BASE_URL}/compute-tasks`, {
        //     method: "POST",
        //     body: JSON.stringify(request),
        //     headers: {
        //         "Content-Type": "application/json",
        //         ...(request.user ? { "X-User-Id": request.user } : {}),
        //     },
        // }).then((r) => r.json());
        return Promise.resolve({
            computeTaskId: `task-${Date.now()}`,
            dashboardUrl: `https://aics-api/jss-dashboard?job_id=task-${Date.now()}&pipeline=${
                request.pipeline
            }`,
        });
    }
}
