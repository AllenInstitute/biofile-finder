import {
    ComputeTaskRequest,
    ComputeTaskResponse,
    Pipeline,
    PipelineParameter,
} from "../../entity/ComputePipeline";
import PipelineService from ".";
import { MOCK_PIPELINES, MOCK_PARAMETERS } from "./mockPipelineData";

// Temporary staging endpoints until the unified FSS pipeline endpoint
// (POST /compute-tasks) is available. Swap these out once the new endpoint lands.
const STAGING_URLS: Record<string, string> = {
    "all-cells-mask-segmentation":
        "http://stg-aics.corp.alleninstitute.org/fss2/v4.0/compute/all-cells-mask",
    "zarr-conversion": "http://stg-aics.corp.alleninstitute.org/fss2/v4.0/compute/zarr-conversion",
};

// TODO: replace with the real FSS base URL once endpoints are available
// const _BASE_URL = "";

export default class HttpPipelineService implements PipelineService {
    getPipelines(): Promise<Pipeline[]> {
        // TODO: return fetch(`${_BASE_URL}/pipelines`).then((r) => r.json());
        return Promise.resolve(MOCK_PIPELINES);
    }

    getParameters(pipelineId: string, _cluster: string): Promise<PipelineParameter[]> {
        // TODO: return fetch(`${_BASE_URL}/pipelines/${pipelineId}/parameters?cluster=${_cluster}`).then((r) => r.json());
        const params = MOCK_PARAMETERS[pipelineId];
        if (!params) {
            return Promise.reject(new Error(`No parameters found for pipeline: ${pipelineId}`));
        }
        return Promise.resolve(params);
    }

    async submitComputeTask(request: ComputeTaskRequest): Promise<ComputeTaskResponse> {
        // TODO: once FSS POST /compute-tasks is live, replace the pipeline-specific
        // branches below with a single call:
        // return fetch(`${_BASE_URL}/compute-tasks`, {
        //     method: "POST",
        //     body: JSON.stringify(request),
        //     headers: {
        //         "Content-Type": "application/json",
        //         ...(request.user ? { "X-User-Id": request.user } : {}),
        //     },
        // }).then((r) => r.json());

        const stagingUrl = STAGING_URLS[request.pipeline];
        if (!stagingUrl) {
            throw new Error(`No submission endpoint configured for pipeline: ${request.pipeline}`);
        }

        const { file_paths, ...rest } = request.parameters;
        const body: Record<string, unknown> = { files: file_paths };
        for (const [key, value] of Object.entries(rest)) {
            if (value !== null && value !== undefined && value !== "") {
                body[key] = value;
            }
        }

        const response = await fetch(stagingUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(request.user ? { "X-User-Id": request.user } : {}),
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`Submission failed: ${response.statusText}`);
        }
        const data = await response.json();
        // Old staging endpoints return manifestCsvPath rather than dashboardUrl.
        // Transform the VAST path to an accessible URL until the new endpoint returns dashboardUrl directly.
        const dashboardUrl =
            data.dashboardUrl ||
            (data.manifestCsvPath
                ? data.manifestCsvPath.replace(
                      "/allen/aics/",
                      "https://vast-files.int.allencell.org/"
                  )
                : "");
        return { computeTaskId: data.computeTaskId, dashboardUrl };
    }
}
