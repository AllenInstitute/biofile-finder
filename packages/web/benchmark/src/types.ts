/**
 * A parquet data source to benchmark against. Injected into the browser by the
 * Playwright runner — the benchmark engine itself has no knowledge of where
 * these come from (real S3, synthetic S3, local server, etc.).
 */
export interface ParquetSource {
    url: string; // s3:// or https:// URL
    label: string; // human-readable scale identifier, e.g. "100k", "1m", "10m"
}

/** Injected as window.__benchmarkConfig before the page loads. */
export interface BenchmarkConfig {
    sources: ParquetSource[];
    iterations?: number; // default 20
    warmupRounds?: number; // default 3
}

export interface QueryResult {
    name: string;
    timings: number[]; // ms per iteration, sorted ascending
    p50: number;
    p95: number;
    p99: number;
}

export interface SourceResult {
    label: string;
    /** Time in ms for prepareDataSources — covers registerFileURL + createParquetDirectView. */
    registrationMs: number;
    queries: QueryResult[];
}

export interface BenchmarkResults {
    timestamp: string;
    commit: string;
    branch: string;
    /** Time in ms to initialize DuckDB-WASM. */
    initTimeMs: number;
    sources: SourceResult[];
}
