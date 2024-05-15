import * as duckdb from "@duckdb/duckdb-wasm";

import { DatabaseService } from "../../../core/services";

export default class DatabaseServiceWeb implements DatabaseService {
    private database: duckdb.AsyncDuckDB | undefined;
    private readonly existingDataSources = new Set<string>();

    public async initialize() {
        // this.database = new duckdb.Database(":memory:");
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
            // await this.database.registerFileBuffer(this.table, pickedFile as any);
            // } else {
            // throw new Error("yo yo yoooooooooooooooooooooooooo")
            // await this.database.registerFileURL(this.table, pickedFile, duckdb.DuckDBDataProtocol.HTTP, false);
            // }
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

    public async saveQueryAsBuffer(sql: string): Promise<Uint8Array> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const connection = await this.database.connect();
        try {
            await connection.send(`COPY (${sql}) TO 'result-example.parquet' (FORMAT 'parquet');`);
            return await this.database.copyFileToBuffer("result-snappy.parquet");
            // const link = URL.createObjectURL(new Blob([parquet_buffer]));
        } finally {
            await connection.close();
        }

        // this.database?.copyFileToBuffer()
        // conn.send(`COPY (SELECT * FROM tbl) TO 'result-snappy.parquet' (FORMAT 'parquet');`);
        // const parquet_buffer = await this._db.copyFileToBuffer('result-snappy.parquet');

        // // Generate a download link
        // const link = URL.createObjectURL(new Blob([parquet_buffer]));

        // // Close the connection to release memory
        // await conn.close();
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
