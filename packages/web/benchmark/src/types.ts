/**
 * A parquet data source to benchmark against. Injected into the browser by the
 * Playwright runner — the benchmark engine itself has no knowledge of where
 * these come from (real S3, synthetic S3, local server, etc.).
 */
export interface ParquetSource {
    url: string;
    label: string;
}

export type TestCase = ParquetSource[];

/** Injected as window.__benchmarkConfig before the page loads. */
export interface BenchmarkConfig {
    testCases: TestCase[];
    iterations?: number;
    warmupRounds?: number;
}

export interface QueryResult {
    name: string;
    timings: number[]; // ms per iteration, sorted ascending
    p50: number;
    p95: number;
    p99: number;
}

export interface SourceResult {
    labels: string[];
    registrationMs: number;
    queries: QueryResult[];
}

export interface BenchmarkResults {
    timestamp: string;
    commit: string;
    branch: string;
    initTimeMs: number;
    results: SourceResult[];
}
