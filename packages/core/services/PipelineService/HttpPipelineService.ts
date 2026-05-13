import {
    ComputeTaskRequest,
    ComputeTaskResponse,
    Pipeline,
    PipelineParameter,
} from "../../entity/ComputePipeline";
import PipelineService from ".";
import { MOCK_PIPELINES, MOCK_PARAMETERS } from "./mockPipelineData";
import { LoadBalancerBaseUrl } from "../../constants";

export default class HttpPipelineService implements PipelineService {
    private readonly baseUrl: string;

    constructor(baseUrl: string = LoadBalancerBaseUrl.PRODUCTION) {
        this.baseUrl = baseUrl;
    }

    getPipelines(): Promise<Pipeline[]> {
        // TODO: return fetch(`${this.baseUrl}/fss2/v4.0/pipelines`).then((r) => r.json());
        return Promise.resolve(MOCK_PIPELINES);
    }

    getParameters(pipelineId: string, _cluster: string): Promise<PipelineParameter[]> {
        // TODO: return fetch(`${this.baseUrl}/fss2/v4.0/pipelines/${pipelineId}/parameters?cluster=${_cluster}`).then((r) => r.json());
        const params = MOCK_PARAMETERS[pipelineId];
        if (!params) {
            return Promise.reject(new Error(`No parameters found for pipeline: ${pipelineId}`));
        }
        return Promise.resolve(params);
    }

    async submitComputeTask(request: ComputeTaskRequest): Promise<ComputeTaskResponse> {
        // TODO: once FSS POST /compute-tasks is live, replace with:
        // return fetch(`${this.baseUrl}/fss2/v4.0/compute-tasks`, {
        //     method: "POST",
        //     body: JSON.stringify(request),
        //     headers: {
        //         "Content-Type": "application/json",
        //         ...(request.user ? { "X-User-Id": request.user } : {}),
        //     },
        // }).then((r) => r.json());

        const url = `${this.baseUrl}/fss2/v4.0/compute/${request.pipeline}`;

        const { file_paths, ...rest } = request.parameters;
        const body: Record<string, unknown> = { files: file_paths };
        for (const [key, value] of Object.entries(rest)) {
            if (value !== null && value !== undefined && value !== "") {
                body[key] = value;
            }
        }

        const response = await fetch(url, {
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
        return { computeTaskId: data.computeTaskId, dashboardUrl: data.dashboardUrl ?? "" };
    }
}
