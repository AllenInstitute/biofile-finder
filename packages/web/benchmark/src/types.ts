export interface SchemaConfig {
    label: string;
    extraColumns: number;
    cardinality: "low" | "medium" | "high";
}

export interface QueryResult {
    name: string;
    scale: number;
    schemaLabel: string;
    iterations: number;
    timings: number[]; // ms per iteration, sorted ascending
    p50: number;
    p95: number;
    p99: number;
}

export interface CloudQueryResult {
    name: string;
    /** Time in ms to HEAD the fixture URL — used to contextualise query timings relative to network speed */
    networkBaselineMs: number;
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
    cloudResults: CloudQueryResult[];
}
