import * as duckdb from "@duckdb/duckdb-wasm";

import { DatabaseService } from "../../../core/services";

export default class DatabaseServiceWeb extends DatabaseService {
    private database: duckdb.AsyncDuckDB | undefined;

    public async initialize(logLevel: duckdb.LogLevel = duckdb.LogLevel.INFO) {
        const allBundles = duckdb.getJsDelivrBundles();

        // Selects the best bundle based on browser checks
        const bundle = await duckdb.selectBundle(allBundles);

        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
        );

        // Instantiate the asynchronus version of DuckDB-wasm
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger(logLevel);
        this.database = new duckdb.AsyncDuckDB(logger, worker);

        await this.database.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
    }

    /**
     * Saves the result of the query to the designated location.
     * Returns an array representating the data from the query in the format designated
     */
    public async saveQuery(
        destination: string,
        sql: string,
        format: "parquet" | "csv" | "json"
    ): Promise<Uint8Array> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const resultName = `${destination}.${format}`;
        const formatOptions = format === "json" ? ", ARRAY true" : "";
        const finalSQL = `COPY (${sql}) TO '${resultName}' (FORMAT '${format}'${formatOptions});`;
        const connection = await this.database.connect();
        try {
            await connection.send(finalSQL);
            return await this.database.copyFileToBuffer(resultName);
        } finally {
            await connection.close();
        }
    }

    public async query(sql: string): Promise<{ [key: string]: any }[]> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const connection = await this.database.connect();
        try {
            const result = await connection.query(sql);
            const resultAsArray = result.toArray();
            const resultAsJSONString = JSON.stringify(
                resultAsArray,
                (_, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
            );
            return JSON.parse(resultAsJSONString);
        } catch (err) {
            throw new Error(
                `${(err as Error).message}. \nThe above error occured while executing query: ${sql}`
            );
        } finally {
            await connection.close();
        }
    }

    public async close(): Promise<void> {
        this.database?.detach();
    }

    protected async addDataSource(
        name: string,
        type: "csv" | "json" | "parquet",
        uri: string | File
    ): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        if (uri instanceof File) {
            await this.database.registerFileHandle(
                name,
                uri,
                duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
                true
            );
        } else {
            const protocol = uri.startsWith("s3")
                ? duckdb.DuckDBDataProtocol.S3
                : duckdb.DuckDBDataProtocol.HTTP;

            await this.database.registerFileURL(name, uri, protocol, false);
        }

        if (type === "parquet") {
            await this.execute(`CREATE TABLE "${name}" AS FROM parquet_scan('${name}');`);
        } else if (type === "json") {
            await this.execute(`CREATE TABLE "${name}" AS FROM read_json_auto('${name}');`);
        } else {
            // Default to CSV
            await this.execute(
                `CREATE TABLE "${name}" AS FROM read_csv_auto('${name}', header=true, all_varchar=true);`
            );
        }
    }

    public async execute(sql: string): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const connection = await this.database.connect();
        try {
            await connection.query(sql);
        } finally {
            await connection.close();
        }
    }
}
