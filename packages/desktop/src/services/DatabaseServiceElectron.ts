import * as duckdb from "@duckdb/duckdb-wasm";

import { DatabaseService } from "../../../core/services";

/**
 * Service reponsible for querying against a database
 */
export default class DatabaseServiceElectron extends DatabaseService {
    public async initialize(logLevel: duckdb.LogLevel = duckdb.LogLevel.WARNING) {
        const allBundles = duckdb.getJsDelivrBundles();
        // Selects the best bundle based on browser checks
        const bundle = await duckdb.selectBundle(allBundles);
        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
        );
        // Instantiate the asynchronous version of DuckDB-wasm
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger(logLevel);
        this.database = new duckdb.AsyncDuckDB(logger, worker);
        await this.database.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
    }
}
