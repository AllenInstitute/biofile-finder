import * as duckdb from "@duckdb/duckdb-wasm";
import axios from "axios";
const httpAdapter = require("axios/lib/adapters/http"); // exported from lib, but not typed (can't be fixed through typing augmentation)

import { DatabaseService, DataSource } from "../../../core/services";

export default class DatabaseServiceWeb implements DatabaseService {
    public readonly table: string = "default_table";
    private database: duckdb.AsyncDuckDB | undefined;

    private async initializeDatabaseWorker() {
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

    constructor() {
        this.initializeDatabaseWorker();
    }

    public async setDataSource(pickedFile: File | string): Promise<void> {
        if (!this.database) {
            throw new Error("Database has not yet been initialized");
        }
        await this.database.registerFileHandle(
            this.table,
            pickedFile,
            duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
            true
        );
        // await this.database.registerFileBuffer(this.table, pickedFile as any);
        // } else {
        // throw new Error("yo yo yoooooooooooooooooooooooooo")
        // await this.database.registerFileURL(this.table, pickedFile, duckdb.DuckDBDataProtocol.HTTP, false);
        // }
        const connection = await this.database.connect();
        try {
            // TODO: Other file types...
            await connection.insertCSVFromPath("default_table", {
                schema: "main",
                name: "default_table",
                detect: true,
                header: true,
                // detect: false,
                // header: false,
                delimiter: ",",
                // columns: {
                //     col1: new arrow.Int32(),
                //     col2: new arrow.Utf8(),
                // },
            });
        } finally {
            await connection.close();
        }
    }

    public async saveQueryAsBuffer(sql: string): Promise<Uint8Array> {
        if (!this.database) {
            throw new Error("Database has not yet been initialized");
        }

        const connection = await this.database.connect();
        try {
            await connection.send(`COPY (${sql}) TO 'result-example.parquet' (FORMAT 'parquet');`);
            return await this.database.copyFileToBuffer('result-snappy.parquet');
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

    public async getDataSource(csvUri: string): Promise<DataSource> {
        if (csvUri.startsWith("http")) {
            const response = await axios.get(csvUri, {
                // Ensure this runs with the NodeJS http/https client so that testing across code that makes use of Electron/NodeJS APIs
                // can be done with consistent patterns.
                // Requires the Electron renderer process to be run with `nodeIntegration: true`.
                adapter: httpAdapter,
            });

            // TODO: Can we make sure this doesn't just request 30GB suddenly for example?
            if (response.status >= 400 || response.data === undefined) {
                throw new Error(
                    `Failed to fetch CSV from ${csvUri}. Response status text: ${response.statusText}`
                );
            }
            const urlObj = new URL(csvUri);

            return {
                name: urlObj.pathname.split("/").pop() || "Unknown",
                created: new Date(),
            };
        }

        // TODO: Hmmmm....
        return {
            name: csvUri,
            created: new Date(),
        };
    }

    public async query(sql: string): Promise<any> {
        if (!this.database) {
            throw new Error("Database has not yet been initialized");
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
