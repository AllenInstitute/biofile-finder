import * as duckdb from "@duckdb/duckdb-wasm";

import { DatabaseService } from "../../../core/services";
import { initializeDuckDB } from "../../../core/services/DatabaseService";

/**
 * Service reponsible for querying against a database
 * Uses the DatabaseService parent class implementation
 */
export default class DatabaseServiceElectron extends DatabaseService {
    public async initialize(logLevel: duckdb.LogLevel = duckdb.LogLevel.WARNING) {
        this.database = await initializeDuckDB(logLevel);
    }
}
