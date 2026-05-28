export interface Pipeline {
    id: string;
    name: string;
    description: string;
    restrictions: string | null;
    clusters: string[];
    acceptedExtensions: string[];
    maxFileSizeBytes: number | null;
}

export interface PipelineParameter {
    name: string;
    label: string;
    description: string;
    type: "file_paths" | "number";
    required: boolean;
    default: number | null;
    validation: { min?: number; max?: number };
}

export interface ComputeTaskRequest {
    pipeline: string;
    cluster: string;
    user: string | null;
    parameters: Record<string, unknown>;
}

export interface ComputeTaskResponse {
    computeTaskId: string;
    dashboardUrl: string;
}
