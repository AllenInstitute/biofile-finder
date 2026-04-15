import * as duckdb from "@duckdb/duckdb-wasm";

import { HIDDEN_UID_ANNOTATION } from "../../../core/constants";
import { initializeDuckDB } from "../../../core/services/DatabaseService";
import { createBenchmarkTable } from "./data";
import { BENCHMARK_QUERIES } from "./queries";
import { BenchmarkResults, CloudQueryResult, QueryResult, SchemaConfig } from "./types";

/**
 * Number of timed iterations per query per scale × schema combination.
 * Each iteration runs all queries in a freshly shuffled order (see below).
 */
const ITERATIONS = 20;

/**
 * Number of full passes through all queries before timing begins.
 * Multiple warmup rounds ensure DuckDB's buffer pool and query planner
 * are in a stable, warm state for every query — not just the later ones.
 */
const WARMUP_ROUNDS = 3;

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

function shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

async function runQuery(db: duckdb.AsyncDuckDB, sql: string): Promise<void> {
    const conn = await db.connect();
    try {
        await conn.query(sql);
    } finally {
        await conn.close();
    }
}

/**
 * Benchmark all queries against a single table using a round-robin approach:
 *
 *   1. Warmup — WARMUP_ROUNDS full passes through all queries in fixed order.
 *      This brings DuckDB's buffer pool and query planner to a stable warm state
 *      for every query before any timing begins.
 *
 *   2. Timing — ITERATIONS rounds. In each round all queries run in a freshly
 *      shuffled order. Shuffling prevents any one query from consistently running
 *      in a "hotter" cache position than another, which would dilute comparisons.
 */
async function benchmarkTable(
    db: duckdb.AsyncDuckDB,
    tableName: string,
    scale: number,
    schemaLabel: string
): Promise<QueryResult[]> {
    const sqls = BENCHMARK_QUERIES.map((q) => ({ name: q.name, sql: q.sql(tableName) }));

    // --- Warmup ---
    setStatus(`Warming up ${tableName} (${WARMUP_ROUNDS} rounds)...`);
    for (let w = 0; w < WARMUP_ROUNDS; w++) {
        for (const { sql } of sqls) {
            await runQuery(db, sql);
        }
    }

    // --- Timed iterations (shuffled round-robin) ---
    const timingsMap = new Map<string, number[]>(sqls.map(({ name }) => [name, []]));

    for (let i = 0; i < ITERATIONS; i++) {
        setStatus(`Timing ${tableName} — iteration ${i + 1}/${ITERATIONS}...`);
        for (const { name, sql } of shuffle(sqls)) {
            const start = performance.now();
            await runQuery(db, sql);
            timingsMap.get(name)!.push(performance.now() - start);
        }
    }

    return BENCHMARK_QUERIES.map(({ name }) => {
        const timings = [...(timingsMap.get(name) ?? [])].sort((a, b) => a - b);
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
    });
}

/**
 * Same round-robin approach for cloud queries.
 */
async function benchmarkCloudTable(
    db: duckdb.AsyncDuckDB,
    viewName: string,
    networkBaselineMs: number
): Promise<CloudQueryResult[]> {
    const sqls = BENCHMARK_QUERIES.map((q) => ({ name: q.name, sql: q.sql(viewName) }));

    // --- Warmup ---
    setStatus(`Warming up cloud benchmark (${WARMUP_ROUNDS} rounds)...`);
    for (let w = 0; w < WARMUP_ROUNDS; w++) {
        for (const { sql } of sqls) {
            await runQuery(db, sql);
        }
    }

    // --- Timed iterations (shuffled round-robin) ---
    const timingsMap = new Map<string, number[]>(sqls.map(({ name }) => [name, []]));

    for (let i = 0; i < ITERATIONS; i++) {
        setStatus(`Timing cloud benchmark — iteration ${i + 1}/${ITERATIONS}...`);
        for (const { name, sql } of shuffle(sqls)) {
            const start = performance.now();
            await runQuery(db, sql);
            timingsMap.get(name)!.push(performance.now() - start);
        }
    }

    return BENCHMARK_QUERIES.map(({ name }) => {
        const timings = [...(timingsMap.get(name) ?? [])].sort((a, b) => a - b);
        return {
            name,
            networkBaselineMs,
            iterations: ITERATIONS,
            timings,
            p50: percentile(timings, 50),
            p95: percentile(timings, 95),
            p99: percentile(timings, 99),
        };
    });
}

async function main() {
    setStatus("Initializing DuckDB-WASM...");

    const initStart = performance.now();
    const db = await initializeDuckDB(duckdb.LogLevel.WARNING);
    const initTimeMs = performance.now() - initStart;

    setStatus(`DuckDB initialized in ${initTimeMs.toFixed(0)}ms. Starting benchmark...`);

    // --- In-memory benchmark ---
    // For each scale × schema: create a staging table → export to parquet → drop the table
    // → create a view over the parquet (matching production's createParquetDirectView path).
    // Only one table/view exists at a time to stay within the ~3 GB WASM heap limit.
    const results: QueryResult[] = [];
    let fixtureBuffer: Uint8Array | null = null;

    for (const schema of SCHEMA_CONFIGS) {
        const scales = ALL_SCALES.filter((s) => s <= schema.maxScale);
        for (const scale of scales) {
            const tableName = `bench_${scale}_${schema.label}`;
            const parquetFile = `${tableName}.parquet`;

            // 1. Build the staging table (no hidden_bff_uid — parquet doesn't store it)
            setStatus(`Creating table ${tableName}...`);
            await createBenchmarkTable(db, tableName, scale, schema);

            // 2. Export to parquet and re-register the buffer so parquet_scan can read it
            setStatus(`Exporting ${tableName} to parquet...`);
            {
                const conn = await db.connect();
                try {
                    await conn.query(`COPY "${tableName}" TO '/${parquetFile}' (FORMAT PARQUET)`);
                } finally {
                    await conn.close();
                }
            }
            const parquetBuffer = await db.copyFileToBuffer(`/${parquetFile}`);
            await db.registerFileBuffer(parquetFile, parquetBuffer);

            // 3. Drop the staging table; replace with a parquet_scan view that injects
            //    hidden_bff_uid from DuckDB's file_row_number virtual column — exactly
            //    what DatabaseService.createParquetDirectView does in production.
            {
                const conn = await db.connect();
                try {
                    await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
                    await conn.query(
                        `CREATE VIEW "${tableName}" AS
                         SELECT *, file_row_number AS "${HIDDEN_UID_ANNOTATION}"
                         FROM parquet_scan('${parquetFile}')`
                    );
                } finally {
                    await conn.close();
                }
            }

            // 4. Export the cloud fixture from the view after it is set up.
            //    Re-exporting via COPY ensures a clean buffer independent of the
            //    parquetBuffer that was transferred to the WASM worker above.
            if (tableName === CLOUD_FIXTURE_TABLE) {
                setStatus("Exporting fixture parquet for cloud benchmark...");
                const conn = await db.connect();
                try {
                    await conn.query(
                        `COPY (SELECT * FROM "${CLOUD_FIXTURE_TABLE}") TO '/fixture.parquet' (FORMAT PARQUET)`
                    );
                } finally {
                    await conn.close();
                }
                fixtureBuffer = await db.copyFileToBuffer("/fixture.parquet");
            }

            // 5. Benchmark the view (same name, same queries — now exercises parquet_scan)
            const tableResults = await benchmarkTable(db, tableName, scale, schema.label);
            results.push(...tableResults);

            // 6. Drop the view to free memory before the next allocation
            {
                const conn = await db.connect();
                try {
                    await conn.query(`DROP VIEW IF EXISTS "${tableName}"`);
                } finally {
                    await conn.close();
                }
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

    const cloudResults = await benchmarkCloudTable(db, "cloud_bench", networkBaselineMs);

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
