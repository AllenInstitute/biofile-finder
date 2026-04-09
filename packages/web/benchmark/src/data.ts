import * as duckdb from "@duckdb/duckdb-wasm";

/**
 * Create a synthetic data table inside DuckDB using its built-in range() generator.
 * The schema mirrors a realistic BFF parquet source with file metadata columns and
 * a few typed annotation columns.
 *
 * The table is named "bench_<rowCount>" (e.g. "bench_10000").
 */
export async function createBenchmarkTable(
    db: duckdb.AsyncDuckDB,
    tableName: string,
    rowCount: number
): Promise<void> {
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
                (FLOOR(RANDOM() * 10))::INTEGER                        AS cell_line,
                (FLOOR(RANDOM() * 5))::INTEGER                         AS plate_id,
                (FLOOR(RANDOM() * 4))::INTEGER                         AS channel
            FROM range(${rowCount})
        `);
    } finally {
        await conn.close();
    }
}
