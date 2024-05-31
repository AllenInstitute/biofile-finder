import * as duckdb from "@duckdb/duckdb-wasm";

import { DatabaseService } from "../../../core/services";
import SQLBuilder from "../../../core/entity/SQLBuilder";
import Annotation from "../../../core/entity/Annotation";
import { AnnotationType } from "../../../core/entity/AnnotationFormatter";

export default class DatabaseServiceWeb implements DatabaseService {
    private database: duckdb.AsyncDuckDB | undefined;
    private readonly existingDataSources = new Set<string>();

    private static columnTypeToAnnotationType(columnType: string): string {
        switch (columnType) {
            case "INTEGER":
            case "BIGINT":
            // TODO: Add support for column types
            // https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues/60
            // return AnnotationType.NUMBER;
            case "VARCHAR":
            case "TEXT":
            default:
                return AnnotationType.STRING;
        }
    }

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

    public async createViewOfDataSources(dataSources: string[]): Promise<void> {
        const viewName = dataSources.join(", ");

        // Prevent adding the same data source multiple times by shortcutting out here
        if (this.existingDataSources.has(viewName)) {
            return;
        }

        const columnsSoFar = new Set<string>();
        for (const dataSource of dataSources) {
            // Fetch information about this data source
            const annotationsInDataSource = await this.fetchAnnotations(dataSource);
            const columnsInDataSource = annotationsInDataSource.map(
                (annotation) => annotation.name
            );
            const newColumns = columnsInDataSource.filter((column) => !columnsSoFar.has(column));

            // If there are no columns / data added yet we need to create the table from
            // scratch so we can provide an easy shortcut around the default way of adding
            // data to a table
            if (columnsSoFar.size === 0) {
                await this.execute(`CREATE TABLE "${viewName}" AS FROM  "${dataSource}"`);
                this.existingDataSources.add(viewName);
            } else {
                // If adding data to an existing table we will need to add any new columns
                if (newColumns.length) {
                    await this.execute(`
                        ALTER TABLE "${viewName}"
                        ADD ${newColumns.map((c) => `"${c}" VARCHAR`).join(", ")}
                    `);
                }

                // After we have added any new columns to the table schema we just need
                // to insert the data from the new table to this table replacing any non-existent
                // columns with an empty value (null)
                const columnsSoFarArr = [...columnsSoFar, ...newColumns];
                await this.execute(`
                    INSERT INTO "${viewName}" ("${columnsSoFarArr.join('", "')}")
                    SELECT ${columnsSoFarArr
                        .map((column) =>
                            columnsInDataSource.includes(column) ? `"${column}"` : "NULL"
                        )
                        .join(", ")}
                    FROM "${dataSource}"
                `);
            }

            // Add the new columns from this data source to the existing columns
            // to avoid adding duplicate columns
            newColumns.forEach((column) => columnsSoFar.add(column));
        }
    }

    private async fetchAnnotations(dataSource: string): Promise<Annotation[]> {
        const sql = new SQLBuilder()
            .from("information_schema.columns")
            .where(`table_name = '${dataSource}'`)
            .toSQL();
        const rows = (await this.query(sql)) as any[]; // TODO: so many things to do
        return rows.map(
            (row) =>
                new Annotation({
                    annotationDisplayName: row["column_name"],
                    annotationName: row["column_name"],
                    description: "",
                    type: DatabaseServiceWeb.columnTypeToAnnotationType(row["data_type"]),
                })
        );
    }

    public async addDataSource(
        name: string,
        type: "csv" | "json" | "parquet",
        uri: File | string
    ): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }
        if (this.existingDataSources.has(name)) {
            return;
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
                `CREATE TABLE "${name}" AS FROM read_csv_auto('${name}', header=true);`
            );
        }
        this.existingDataSources.add(name);
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

    public async close(): Promise<void> {
        this.database?.detach();
    }

    private async execute(sql: string): Promise<void> {
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
