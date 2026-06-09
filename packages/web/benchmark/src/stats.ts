import { QueryResult } from "./types";

export const DEFAULT_ITERATIONS = 5;
export const DEFAULT_WARMUP_ROUNDS = 1;

export function percentile(sorted: number[], p: number): number {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

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
