import * as duckdb from "@duckdb/duckdb-wasm";

import { DatabaseService } from "../../../core/services";

export default class DatabaseServiceWeb extends DatabaseService {
    private database: duckdb.AsyncDuckDB | undefined;

    public async initialize(logLevel: duckdb.LogLevel = duckdb.LogLevel.INFO) {
        const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
            mvp: {
                mainModule: './duckdb-mvp.wasm',
                mainWorker: './duckdb-browser-mvp.worker.js',
            },
            eh: {
                mainModule: './duckdb-eh.wasm',
                mainWorker: './duckdb-browser-eh.worker.js',
            },
        };
        // Select a bundle based on browser checks
        const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
        // Instantiate the asynchronous version of DuckDB-Wasm
        const worker = new Worker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        this.database = new duckdb.AsyncDuckDB(logger, worker);

        await this.database.instantiate(bundle.mainModule, bundle.pthreadWorker);

        const tmpConn = await this.database.connect();
        console.debug('Extensions installed:', await tmpConn.send('SELECT extension_name, installed, description FROM duckdb_extensions();'))
        console.debug("Did db instantiate");

        const listDirectoryContents = async (directoryHandle: any, depth = 1) => {
            const entries = directoryHandle.values();
        
            for await (const entry of entries) {
                const indentation = ' '.repeat(depth);
                
                if (entry.kind === 'directory') {
                    console.log(`${indentation}${entry.name}/`);
                    await listDirectoryContents(entry, depth + 1);
                } else {
                    console.log(`${indentation}${entry.name} ${(await entry.getFile()).size/1000_000}MB`);
                    directoryHandle.removeEntry(entry.name);
                }
            }
        };
        
        // Usage
        const rootDirectoryHandle = await navigator.storage.getDirectory();
        await listDirectoryContents(rootDirectoryHandle);

        // const opfsRoot = await navigator.storage.getDirectory();
        // console.debug("opfsRoot", opfsRoot);
        // const newDir = await opfsRoot.getDirectoryHandle("bff_duckdb_tmp_dir", { create: true });
        // const opfsDir = `opfs://${newDir.name}`;
        // console.debug("opfsDir", opfsDir);
        await this.database.open({
            path: 'opfs://spilltest7/duck.db',
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
            opfs: {
                tempPath: 'opfs://spilltest7/tmp',
            },
        });
        const connection = await this.database.connect();
        // const result = await connection.send(`SET temp_directory='${opfsDir}'`);
        // console.debug("temp_directory result", result);
        // await connection.send(`PRAGMA memory_limit='4MB';`)
        // await connection.send(`SET max_temp_directory_size = '1000MiB';`);
        // const tmpDir = await connection.send('SHOW temp_directory');
        // console.debug("temp_directory", tmpDir);
        for (let i=0; i < 20; i++) {
            const spillQuery = `SELECT COUNT(*) FROM (SELECT i FROM range(0, 800000) i ORDER BY hash(i) LIMIT 100000)`;
            const spillQueryResult = await connection.send(spillQuery);
            await spillQueryResult.next();
        }
        console.debug("spillQuery successful")
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
            const name = Math.random().toString() + sql;
            console.time(name);
            const result = await connection.query(sql);
            console.timeEnd(name);
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
