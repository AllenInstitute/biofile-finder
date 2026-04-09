export interface QueryResult {
    name: string;
    scale: number;
    iterations: number;
    timings: number[]; // ms per iteration, sorted ascending
    p50: number;
    p95: number;
    p99: number;
}

export interface BenchmarkResults {
    timestamp: string;
    commit: string;
    branch: string;
    initTimeMs: number;
    results: QueryResult[];
}
