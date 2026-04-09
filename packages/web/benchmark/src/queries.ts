export interface BenchmarkQuery {
    name: string;
    // tableName is the synthetic data table created at a given scale
    sql: (tableName: string) => string;
}

/**
 * Suite of queries that mirrors the types of operations BFF performs against DuckDB-WASM.
 *
 * Each query is run at every scale (100 / 1k / 10k rows) with a warm-up pass
 * before the timed iterations begin.
 */
export const BENCHMARK_QUERIES: BenchmarkQuery[] = [
    // Schema introspection — what fetchAnnotations does
    {
        name: "fetch_annotations",
        sql: (t) =>
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`,
    },
    // Baseline scan — simplest possible query
    {
        name: "count_all",
        sql: (t) => `SELECT COUNT(*) FROM "${t}"`,
    },
    // File-size filter — typical user filter
    {
        name: "filter_by_size",
        sql: (t) => `SELECT * FROM "${t}" WHERE "File Size" > 5000000 LIMIT 100`,
    },
    // Sort + paginate — the main file list query pattern
    {
        name: "sort_and_paginate",
        sql: (t) => `SELECT * FROM "${t}" ORDER BY "File Size" DESC LIMIT 100 OFFSET 0`,
    },
    // Multi-column filter — structured metadata / annotation filter
    {
        name: "multi_column_filter",
        sql: (t) => `SELECT * FROM "${t}" WHERE cell_line = 3 AND plate_id = 2 LIMIT 100`,
    },
    // Group + aggregate — used for annotation value enumeration
    {
        name: "group_and_aggregate",
        sql: (t) =>
            `SELECT cell_line, COUNT(*) AS count, AVG("File Size") AS avg_size ` +
            `FROM "${t}" GROUP BY cell_line ORDER BY cell_line`,
    },
    // Wildcard text search — LIKE filter on file name
    {
        name: "text_search",
        sql: (t) => `SELECT * FROM "${t}" WHERE "File Name" LIKE '%_5%' LIMIT 100`,
    },
];
