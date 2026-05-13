import {
    ComputeTaskRequest,
    ComputeTaskResponse,
    Pipeline,
    PipelineParameter,
} from "../../entity/ComputePipeline";
import PipelineService from ".";
import { MOCK_PIPELINES, MOCK_PARAMETERS } from "./mockPipelineData";

// TODO: replace with the real FSS base URL once endpoints are available
const _BASE_URL = "";

export default class HttpPipelineService implements PipelineService {
    getPipelines(): Promise<Pipeline[]> {
        // TODO: return fetch(`\${_BASE_URL}/pipelines`).then((r) => r.json());
        return Promise.resolve(MOCK_PIPELINES);
    }

    getParameters(pipelineId: string, _cluster: string): Promise<PipelineParameter[]> {
        // TODO: return fetch(`\${_BASE_URL}/pipelines/${pipelineId}/parameters?cluster=${_cluster}`).then((r) => r.json());
        const params = MOCK_PARAMETERS[pipelineId];
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
