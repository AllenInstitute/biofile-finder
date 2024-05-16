import * as duckdb from "@duckdb/duckdb-wasm";
import { uniqueId } from "lodash";

import { DatabaseService } from "../../../core/services";

export default class DatabaseServiceWeb implements DatabaseService {
    private database: duckdb.AsyncDuckDB | undefined;
    private readonly existingDataSources = new Set<string>();

    public async initialize() {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

        // Select a bundle based on browser checks
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
        );

        // Instantiate the asynchronus version of DuckDB-wasm
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger();
        this.database = new duckdb.AsyncDuckDB(logger, worker);

        await this.database.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
    }

    public async addDataSource(name: string, uri: File | string): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }
        if (!this.existingDataSources.has(name)) {
            if (uri instanceof File) {
                await this.database.registerFileHandle(
                    name,
                    uri,
                    duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
                    true
                );
            } else {
                await this.database.registerFileURL(name, uri, duckdb.DuckDBDataProtocol.HTTP, false);
            }
            const connection = await this.database.connect();
            try {
                // TODO: Other file types...
                await connection.insertCSVFromPath(name, {
                    name,
                    schema: "main",
                    detect: true,
                    header: true,
                    delimiter: ",",
                });
                this.existingDataSources.add(name);
            } finally {
                await connection.close();
            }
        }
    }

    public async saveQueryAsBuffer(sql: string, format: "parquet" | "csv" | "json"): Promise<Uint8Array> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const resultName = `${uniqueId()}.${format}`
        const finalSQL = `COPY (${sql}) TO '${resultName}' (FORMAT '${format}');`;
        const connection = await this.database.connect();
        try {
            await connection.send(finalSQL);
            return await this.database.copyFileToBuffer(resultName);
        } finally {
            await connection.close();
        }
    }

    public async query(sql: string): Promise<any> {
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
        } finally {
            await connection.close();
        }
    }
}
