import {
    ComputeTaskRequest,
    ComputeTaskResponse,
    Pipeline,
    PipelineParameter,
} from "../../entity/ComputePipeline";

export default interface PipelineService {
    getPipelines(): Promise<Pipeline[]>;
    getParameters(pipelineId: string, cluster: string): Promise<PipelineParameter[]>;
    submitComputeTask(request: ComputeTaskRequest): Promise<ComputeTaskResponse>;
}
