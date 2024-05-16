/**
 * Service reponsible for querying against a database
 */
export default interface DatabaseService {
    addDataSource(
        name: string,
        type: "csv" | "json" | "parquet",
        uri: File | string
    ): Promise<void>;

    saveQueryAsBuffer(sql: string, format: "csv" | "parquet" | "json"): Promise<Uint8Array>;

    query(sql: string): Promise<{ [key: string]: string }[]>;
}
