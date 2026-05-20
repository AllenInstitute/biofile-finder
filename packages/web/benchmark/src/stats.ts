import { QueryResult } from "./types";

export const DEFAULT_ITERATIONS = 5;
export const DEFAULT_WARMUP_ROUNDS = 1;

// Nearest-rank percentile over a pre-sorted array. Used to report p50 and p95
// across timed iterations — p95 surfaces occasional slow outliers (GC pauses,
// DuckDB cache misses) that the median would hide.
export function percentile(sorted: number[], p: number): number {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

/**
 * Build a QueryResult from raw timing samples: sorts them and computes
 * p50/p95/p99. Used by both the in-browser benchmark engine and the
 * Playwright runner's cold-start aggregation path.
 */
export function buildQueryResult(name: string, rawTimings: number[]): QueryResult {
    const timings = [...rawTimings].sort((a, b) => a - b);
    return {
        name,
        timings,
        p50: percentile(timings, 50),
        p95: percentile(timings, 95),
        p99: percentile(timings, 99),
    };
}
