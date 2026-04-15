import * as duckdb from "@duckdb/duckdb-wasm";

import { initializeDuckDB } from "../../../core/services/DatabaseService";
import { createBenchmarkTable } from "./data";
import { BENCHMARK_QUERIES } from "./queries";
import { BenchmarkResults, CloudQueryResult, QueryResult, SchemaConfig } from "./types";

const ITERATIONS = 10;

/**
 * Schema configurations to test. Each query is run at every applicable scale × schema
 * combination. Only one table exists in DuckDB at a time (create → benchmark → drop) to
 * stay within the ~3 GB WASM heap limit.
 *
 * narrow: matches the minimal BFF schema (8 columns, low cardinality) — the baseline.
 * wide:   20 extra annotation columns with high cardinality — stress-tests projection cost.
 *         Capped at 1M rows; the interesting dimension is column width, not row count.
 */
const SCHEMA_CONFIGS: Array<SchemaConfig & { maxScale: number }> = [
    { label: "narrow", extraColumns: 0, cardinality: "low", maxScale: 10_000_000 },
    { label: "wide", extraColumns: 20, cardinality: "high", maxScale: 1_000_000 },
];

const ALL_SCALES = [10_000, 100_000, 1_000_000, 10_000_000];

/**
 * The cloud fixture is exported from the narrow 10k-row in-memory table and served
 * over HTTP by the Playwright runner. This exercises DuckDB's HTTP range-request code
 * path — the same path used for real S3/cloud parquet sources in BFF.
 */
const CLOUD_FIXTURE_TABLE = "bench_10000_narrow";

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
    scale: number,
    schemaLabel: string
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
        schemaLabel,
        iterations: ITERATIONS,
        timings,
        p50: percentile(timings, 50),
        p95: percentile(timings, 95),
        p99: percentile(timings, 99),
    };
}

async function benchmarkCloudQuery(
    db: duckdb.AsyncDuckDB,
    name: string,
    sql: string,
    networkBaselineMs: number
): Promise<CloudQueryResult> {
    // Warm-up: one untimed run
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
        networkBaselineMs,
        iterations: ITERATIONS,
        timings,
        p50: percentile(timings, 50),
        p95: percentile(timings, 95),
        p99: percentile(timings, 99),
    };
}

async function main() {
    setStatus("Initializing DuckDB-WASM...");

    const initStart = performance.now();
    const db = await initializeDuckDB(duckdb.LogLevel.WARNING);
    const initTimeMs = performance.now() - initStart;

    setStatus(`DuckDB initialized in ${initTimeMs.toFixed(0)}ms. Starting benchmark...`);

    // --- In-memory benchmark ---
    // Create → benchmark → drop one table at a time to stay within the WASM heap limit.
    // The cloud fixture parquet is exported from CLOUD_FIXTURE_TABLE before it is dropped.
    const results: QueryResult[] = [];
    let fixtureBuffer: Uint8Array | null = null;

    for (const schema of SCHEMA_CONFIGS) {
        const scales = ALL_SCALES.filter((s) => s <= schema.maxScale);
        for (const scale of scales) {
            const tableName = `bench_${scale}_${schema.label}`;
            setStatus(`Creating table ${tableName}...`);
            await createBenchmarkTable(db, tableName, scale, schema);

            for (const query of BENCHMARK_QUERIES) {
                setStatus(`Running ${query.name} @ ${scale} rows / ${schema.label}...`);
                const result = await benchmarkQuery(
                    db,
                    query.name,
                    query.sql(tableName),
                    scale,
                    schema.label
                );
                results.push(result);
            }

            // Export the cloud fixture while this table is still in memory
            if (tableName === CLOUD_FIXTURE_TABLE) {
                setStatus("Exporting fixture parquet for cloud benchmark...");
                const conn = await db.connect();
                try {
                    await conn.query(
                        `COPY "${CLOUD_FIXTURE_TABLE}" TO '/fixture.parquet' (FORMAT PARQUET)`
                    );
                } finally {
                    await conn.close();
                }
                fixtureBuffer = await db.copyFileToBuffer("/fixture.parquet");
            }

            // Drop the table to free memory before the next allocation
            const dropConn = await db.connect();
            try {
                await dropConn.query(`DROP TABLE IF EXISTS "${tableName}"`);
            } finally {
                await dropConn.close();
            }
        }
    }

    if (!fixtureBuffer) {
        throw new Error(
            `Cloud fixture table "${CLOUD_FIXTURE_TABLE}" was never created. ` +
                `Check that SCHEMA_CONFIGS includes a narrow schema and ALL_SCALES includes 10,000.`
        );
    }

    // Expose as a plain array so Playwright can read it via page.evaluate
    (window as any).__fixtureParquet = Array.from(fixtureBuffer);
    (window as any).__inMemoryDone = true;

    // --- Wait for Playwright to write the fixture file and signal the cloud phase ---
    setStatus("Waiting for cloud benchmark signal from Playwright...");
    const cloudFixtureUrl: string = await new Promise<string>((resolve) => {
        (window as any).__startCloudPhase = resolve;
    });

    // --- Cloud benchmark ---
    setStatus(`Registering cloud fixture: ${cloudFixtureUrl}`);
    await db.registerFileURL(
        "cloud_fixture.parquet",
        cloudFixtureUrl,
        (duckdb as any).DuckDBDataProtocol.HTTP,
        false
    );
    {
        const conn = await db.connect();
        try {
            await conn.query(
                `CREATE OR REPLACE VIEW cloud_bench AS SELECT * FROM read_parquet('cloud_fixture.parquet')`
            );
        } finally {
            await conn.close();
        }
    }

    // Measure network baseline: time a HEAD request to the fixture URL
    const netStart = performance.now();
    await fetch(cloudFixtureUrl, { method: "HEAD" });
    const networkBaselineMs = performance.now() - netStart;
    setStatus(`Network baseline: ${networkBaselineMs.toFixed(1)}ms`);

    const cloudResults: CloudQueryResult[] = [];
    for (const query of BENCHMARK_QUERIES) {
        setStatus(`Running cloud ${query.name}...`);
        cloudResults.push(
            await benchmarkCloudQuery(db, query.name, query.sql("cloud_bench"), networkBaselineMs)
        );
    }

    setStatus("Done.");

    const benchmarkResults: BenchmarkResults = {
        timestamp: new Date().toISOString(),
        // commit/branch are injected by the Playwright runner after collection
        commit: "unknown",
        branch: "unknown",
        initTimeMs,
        results,
        cloudResults,
    };

    (window as any).__benchmarkResults = benchmarkResults;
}

main().catch((err: Error) => {
    console.error("[benchmark] Fatal error:", err);
    setStatus(`Error: ${err.message}`);
    (window as any).__benchmarkError = err.message;
});
