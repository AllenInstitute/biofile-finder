import {
    ComputeTaskRequest,
    ComputeTaskResponse,
    Pipeline,
    PipelineParameter,
} from "../../entity/ComputePipeline";
import { MOCK_PIPELINES, MOCK_PARAMETERS } from "./mockPipelineData";
import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

/**
 * Service responsible for fetching available compute pipelines and submitting
 * compute tasks via the FSS HTTP API.
 */
export default class PipelineService extends HttpServiceBase {
    private pipelinesCache: Promise<Pipeline[]> | null = null;

    constructor(config: ConnectionConfig = {}) {
        super(config);
    }

    getPipelines(): Promise<Pipeline[]> {
        if (!this.pipelinesCache) {
            // TODO: this.pipelinesCache = this.get(`${this.loadBalancerBaseUrl}/fss2/v4.0/pipelines`).then((r) => r.data);
            this.pipelinesCache = Promise.resolve(MOCK_PIPELINES);
        }
        return this.pipelinesCache;
    }

    getParameters(pipelineId: string, _cluster: string): Promise<PipelineParameter[]> {
        // TODO: return this.get(`${this.loadBalancerBaseUrl}/fss2/v4.0/pipelines/${pipelineId}/parameters?cluster=${_cluster}`).then((r) => r.data);
        const params = MOCK_PARAMETERS[pipelineId];
        if (!params) {
            return Promise.reject(new Error(`No parameters found for pipeline: ${pipelineId}`));
        }
        return Promise.resolve(params);
    }

    // FSS curls these paths directly, so we need to encode.
    private static encodeFilePath(filePath: unknown): unknown {
        if (typeof filePath !== "string" || !/^[a-z][a-z0-9+.-]*:\/\//i.test(filePath)) {
            return filePath;
        }
        return PipelineService.encodeURISection(filePath);
    }

    async submitComputeTask(request: ComputeTaskRequest): Promise<ComputeTaskResponse> {
        const url = `${this.loadBalancerBaseUrl}/fss2/v4.0/compute/${request.pipeline}`;

        const { file_paths, ...rest } = request.parameters;
        const files = Array.isArray(file_paths)
            ? file_paths.map((p) => PipelineService.encodeFilePath(p))
            : file_paths;
        const body: Record<string, unknown> = { files };
        for (const [key, value] of Object.entries(rest)) {
            if (value !== null && value !== undefined && value !== "") {
                body[key] = value;
            }
        }

        const response = await this.httpClient.post(url, body, {
            headers: {
                "Content-Type": "application/json",
                ...(request.user ? { "X-User-Id": request.user } : {}),
            },
        });

        return {
            computeTaskId: response.data.computeTaskId,
            dashboardUrl: response.data.dashboardUrl ?? "",
        };
    }
}
