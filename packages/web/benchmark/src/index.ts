import * as duckdb from "@duckdb/duckdb-wasm";

import { initializeDuckDB } from "../../../core/services/DatabaseService";
import { createBenchmarkTable } from "./data";
import { BENCHMARK_QUERIES } from "./queries";
import { BenchmarkResults, QueryResult } from "./types";

const SCALES = [10_000, 100_000, 1_000_000, 10_000_000];
const ITERATIONS = 10;

function setStatus(msg: string) {
    const el = document.getElementById("status");
    if (el) el.textContent = msg;
    console.log("[benchmark]", msg);
}

function percentile(sorted: number[], p: number): number {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

async function runQuery(db: duckdb.AsyncDuckDB, sql: string): Promise<void> {
    const conn = await db.connect();
    try {
        await conn.query(sql);
    } finally {
        await conn.close();
    }
}

async function benchmarkQuery(
    db: duckdb.AsyncDuckDB,
    name: string,
    sql: string,
    scale: number
): Promise<QueryResult> {
    // Warm-up: one untimed run to prime DuckDB's query planner / caches
    await runQuery(db, sql);

    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await runQuery(db, sql);
        timings.push(performance.now() - start);
    }

    timings.sort((a, b) => a - b);

    return {
        name,
        scale,
        iterations: ITERATIONS,
        timings,
        p50: percentile(timings, 50),
        p95: percentile(timings, 95),
        p99: percentile(timings, 99),
    };
}

async function main() {
    setStatus("Initializing DuckDB-WASM...");
    setStatus(`crossOriginIsolated: ${(window as any).crossOriginIsolated}`);

    const initStart = performance.now();
    const db = await initializeDuckDB(duckdb.LogLevel.WARNING);
    const initTimeMs = performance.now() - initStart;

    setStatus(`DuckDB initialized in ${initTimeMs.toFixed(0)}ms. Creating tables...`);

    for (const scale of SCALES) {
        await createBenchmarkTable(db, `bench_${scale}`, scale);
        setStatus(`Created table bench_${scale}`);
    }

    const results: QueryResult[] = [];

    for (const scale of SCALES) {
        for (const query of BENCHMARK_QUERIES) {
            setStatus(`Running ${query.name} @ scale=${scale}...`);
            const result = await benchmarkQuery(db, query.name, query.sql(`bench_${scale}`), scale);
            results.push(result);
        }
    }

    const benchmarkResults: BenchmarkResults = {
        timestamp: new Date().toISOString(),
        // commit/branch are injected by the Playwright runner after collection
        commit: "unknown",
        branch: "unknown",
        initTimeMs,
        results,
    };

    setStatus("Done.");
    (window as any).__benchmarkResults = benchmarkResults;
}

main().catch((err: Error) => {
    console.error("[benchmark] Fatal error:", err);
    setStatus(`Error: ${err.message}`);
    (window as any).__benchmarkError = err.message;
});
