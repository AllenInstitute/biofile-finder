import {
    ComputeTaskRequest,
    ComputeTaskResponse,
    Pipeline,
    PipelineParameter,
    PipelineParameterType,
} from "../../entity/ComputePipeline";
import { JSSBaseUrl } from "../../constants";
import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

interface JssPipelineSummary {
    id: string;
    name: string;
    description: string;
}

interface JssPipeline extends JssPipelineSummary {
    clusters: string[];
    destinations?: string[];
    allowedFileExtensions?: string[];
    maxFileSizeBytes?: number | null;
    restrictions?: string | null;
    parameterSchema?: Record<string, unknown>;
}

function inferParameterType(prop: Record<string, unknown>): PipelineParameterType {
    if (Array.isArray(prop.enum)) return "select";
    if (prop.type === "number" || prop.type === "integer") return "number";
    return "string";
}

function deriveParametersFromSchema(schema: Record<string, unknown>): PipelineParameter[] {
    const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const requiredFields = new Set((schema.required ?? []) as string[]);

    return Object.entries(properties).map(([name, prop]) => {
        const type = inferParameterType(prop);
        return {
            name,
            label: (prop.title as string) ?? name,
            description: (prop.description as string) ?? "",
            type,
            required: requiredFields.has(name),
            default: (prop.default as number | string | null) ?? null,
            options: type === "select" ? (prop.enum as unknown[]).map(String) : undefined,
            validation: {
                min: prop.minimum as number | undefined,
                max: prop.maximum as number | undefined,
                pattern: prop.pattern as string | undefined,
            },
        };
    });
}

function mapJssPipeline(jss: JssPipeline): Pipeline {
    return {
        id: jss.id,
        name: jss.name,
        description: jss.description,
        restrictions: jss.restrictions ?? null,
        clusters: jss.clusters,
        destinations: jss.destinations ?? [],
        acceptedExtensions: jss.allowedFileExtensions ?? [],
        maxFileSizeBytes: jss.maxFileSizeBytes ?? null,
        parameterSchema: jss.parameterSchema,
    };
}

/**
 * Service responsible for fetching available compute pipelines and submitting
 * compute tasks via the JSS API.
 */
export default class PipelineService extends HttpServiceBase {
    private readonly jssBaseUrl: string;
    private pipelinesCache: Promise<Pipeline[]> | null = null;

    constructor(config: ConnectionConfig = {}) {
        super(config);
        this.jssBaseUrl = config.jssBaseUrl ?? JSSBaseUrl.PRODUCTION;
    }

    getPipelines(): Promise<Pipeline[]> {
        if (!this.pipelinesCache) {
            this.pipelinesCache = this.httpClient
                .get(`${this.jssBaseUrl}/jss/1.0/compute/pipelines`)
                .then((r) => r.data as JssPipelineSummary[])
                .then((summaries) =>
                    Promise.all(
                        summaries.map((s) =>
                            this.httpClient
                                .get(`${this.jssBaseUrl}/jss/1.0/compute/pipelines/${s.id}`)
                                .then((r) => mapJssPipeline(r.data as JssPipeline))
                        )
                    )
                )
                .catch((err) => {
                    this.pipelinesCache = null;
                    throw err;
                });
        }
        return this.pipelinesCache;
    }

    getParameters(pipelineId: string, _cluster: string): Promise<PipelineParameter[]> {
        return this.getPipelines().then((pipelines) => {
            const pipeline = pipelines.find((p) => p.id === pipelineId);
            if (!pipeline?.parameterSchema) return [];
            return deriveParametersFromSchema(pipeline.parameterSchema);
        });
    }

    // FSS curls these paths directly, so we need to encode.
    private static encodeFilePath(filePath: string): string {
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(filePath)) {
            return filePath;
        }
        return PipelineService.encodeURISection(filePath);
    }

    async submitComputeTask(request: ComputeTaskRequest): Promise<ComputeTaskResponse> {
        const url = `${this.jssBaseUrl}/jss/1.0/compute/pipelines/run`;

        const parameters: Record<string, string> = {};
        for (const [key, value] of Object.entries(request.parameters)) {
            if (value !== "") {
                parameters[key] = value;
            }
        }

        // Shape dictated by JSS's PipelineRunRequest
        const body = {
            pipelineId: request.pipeline,
            cluster: request.cluster,
            destination: request.destination,
            filePaths: request.filePaths.map((p) => PipelineService.encodeFilePath(p)),
            parameters,
            user: request.user,
        };

        const response = await this.httpClient.post(url, body, {
            headers: { "Content-Type": "application/json" },
        });

        return {
            computeTaskId: response.data.runId,
            dashboardUrl: response.data.dashboardUrl ?? "",
        };
    }

    async validateUser(userName: string): Promise<boolean> {
        const url = `${
            this.metadataManagementServiceBaseURl
        }/metadata-management-service/1.0/user?userName=${encodeURIComponent(userName)}`;
        try {
            await this.httpClient.get(url);
            return true;
        } catch (err: any) {
            if (err?.response?.status === 404) return false;
            throw err;
        }
    }
}
