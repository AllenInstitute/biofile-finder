/**
 * Service reponsible for querying against a database
 */
export default interface DatabaseService {
    addDataSource(
        name: string,
        type: "csv" | "json" | "parquet",
        uri: File | string
    ): Promise<void>;

    addDatasetManifest(name: string, uri: string): Promise<void>;

    saveQuery(
        destination: string,
        sql: string,
        format: "csv" | "parquet" | "json"
    ): Promise<Uint8Array>;

    query(sql: string): Promise<{ [key: string]: string }[]>;
}
