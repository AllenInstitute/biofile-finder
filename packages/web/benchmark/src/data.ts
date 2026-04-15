import * as duckdb from "@duckdb/duckdb-wasm";

import { SchemaConfig } from "./types";

const CARDINALITY_MODULO: Record<SchemaConfig["cardinality"], number | null> = {
    // Low: 4 distinct values per column (like cell_line / channel in real data)
    low: 4,
    // Medium: 100 distinct values
    medium: 100,
    // High: cardinality equals row count (every value unique) — null signals this
    high: null,
};

/**
 * Create a synthetic data table inside DuckDB using its built-in range() generator.
 *
 * The base schema mirrors a realistic BFF parquet source:
 *   File ID, File Path, File Name, File Size, Uploaded, cell_line, plate_id, channel
 *
 * `schema.extraColumns` additional annotation columns are appended, each with the
 * cardinality defined by `schema.cardinality`.
 *
 * The table is named "bench_<rowCount>_<schemaLabel>" (e.g. "bench_100000_narrow").
 */
export async function createBenchmarkTable(
    db: duckdb.AsyncDuckDB,
    tableName: string,
    rowCount: number,
    schema: SchemaConfig
): Promise<void> {
    const modulo = CARDINALITY_MODULO[schema.cardinality] ?? rowCount;

    const extraColExprs =
        schema.extraColumns > 0
            ? ",\n" +
              Array.from(
                  { length: schema.extraColumns },
                  (_, i) => `                (FLOOR(RANDOM() * ${modulo}))::INTEGER AS "extra_${i}"`
              ).join(",\n")
            : "";

    const conn = await db.connect();
    try {
        await conn.query(`
            CREATE OR REPLACE TABLE "${tableName}" AS
            SELECT
                range::VARCHAR                                          AS "File ID",
                'https://s3.us-west-2.amazonaws.com/bucket/data/file_'
                    || range || '.tiff'                                 AS "File Path",
                'file_' || range || '.tiff'                            AS "File Name",
                (FLOOR(RANDOM() * 10_000_000))::BIGINT                 AS "File Size",
                (DATE '2024-01-01'
                    + (FLOOR(RANDOM() * 365))::INTEGER)                AS "Uploaded",
                (FLOOR(RANDOM() * ${modulo}))::INTEGER                 AS cell_line,
                (FLOOR(RANDOM() * ${Math.max(1, Math.ceil(modulo / 2))}))::INTEGER AS plate_id,
                (FLOOR(RANDOM() * ${Math.max(
                    1,
                    Math.ceil(modulo / 4)
                )}))::INTEGER AS channel${extraColExprs},
                range::INTEGER                                          AS hidden_bff_uid
            FROM range(${rowCount})
        `);
    } finally {
        await conn.close();
    }
}
