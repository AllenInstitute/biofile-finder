export interface Pipeline {
    id: string;
    name: string;
    description: string;
    restrictions: string | null;
    clusters: string[];
    acceptedExtensions: string[];
    maxFileSizeBytes: number | null;
}

export type PipelineParameterType = "file_paths" | "string" | "number" | "select";

export interface PipelineParameter {
    name: string;
    label: string;
    description: string;
    type: PipelineParameterType;
    required: boolean;
    default: number | string | null;
    options?: string[];
    validation: { min?: number; max?: number; pattern?: string };
}

export interface ComputeTaskRequest {
    pipeline: string;
    cluster: string;
    user: string | null;
    filePaths: string[];
    parameters: Record<string, string>;
}

export interface ComputeTaskResponse {
    computeTaskId: string;
    dashboardUrl: string;
}
