import * as duckdb from "@duckdb/duckdb-wasm";

import { AICS_FMS_DATA_SOURCE_NAME } from "../../../core/constants";
import { Source } from "../../../core/entity/SearchParams";
import SQLBuilder from "../../../core/entity/SQLBuilder";
import DataSourcePreparationError from "../../../core/errors/DataSourcePreparationError";
import { DatabaseService } from "../../../core/services";
import {
    getActualToPreDefinedColumnMap,
    getFileNameFromPathExpression,
    getParquetFileNameSelectPart,
    getUpdateHiddenUIDSQL,
    PreDefinedColumn,
    RAW_SUFFIX,
    truncateString,
} from "../../../core/services/DatabaseService/utils";

/**
 * Service reponsible for querying against a database
 */
export default class DatabaseServiceElectron extends DatabaseService {
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);

    protected database: duckdb.AsyncDuckDB | undefined;

    constructor() {
        super();
        this.addDataSource = this.addDataSource.bind(this);
    }

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

    public query(
        sql: string
    ): { promise: Promise<{ [key: string]: any }[]>; cancel?: (reason?: string) => void } {
        return { promise: this.runQuery(sql) };
    }

    private async runQuery(sql: string): Promise<{ [key: string]: any }[]> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }
        const connection = await this.database?.connect();
        try {
            const result = await connection.query(sql);
            const resultAsArray = result.toArray();
            const resultAsJSONString = JSON.stringify(
                resultAsArray,
                (_, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
            );
            const parsedResults = JSON.parse(resultAsJSONString);
            return parsedResults;
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

        // Register the user's input under an internal name so we can create a
        // table or view named `name`
        const registerName = `${name}${RAW_SUFFIX}.${type}`;

        if (uri instanceof File) {
            await this.database.registerFileHandle(
                registerName,
                uri,
                duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
                true
            );
        } else {
            const protocol = uri.startsWith("s3")
                ? duckdb.DuckDBDataProtocol.S3
                : duckdb.DuckDBDataProtocol.HTTP;

            await this.database.registerFileURL(registerName, uri, protocol, false);
        }

        if (type === "parquet") {
            await this.createParquetDirectView(name, registerName);
        } else if (type === "json") {
            await this.execute(`CREATE TABLE "${name}" AS FROM read_json_auto('${registerName}');`);
        } else {
            // Default to CSV
            await this.execute(
                `CREATE TABLE "${name}" AS FROM read_csv_auto('${registerName}', header=true, all_varchar=true);`
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

    protected async prepareDataSource(
        dataSource: Source,
        skipNormalization: boolean
    ): Promise<void> {
        const { name, type, uri } = dataSource;

        if (!type || !uri) {
            throw new DataSourcePreparationError(
                `Lost access to the data source.\
                </br> \
                Local data sources must be re-uploaded with each \
                page refresh to gain access to the data source file \
                on your computer. \
                To avoid this, consider using cloud storage for the \
                file and sharing the URL.`,
                name
            );
        }
        // Add the data source as a table on the database
        await this.addDataSource(name, type, uri);

        // Add data source name to in-memory set
        // for quick data source checks
        this.existingDataSources.add(name);

        // Unless skipped, this will ensure the table is prepared
        // for querying with the expected columns & uniqueness constraints
        if (!skipNormalization) {
            if (type !== "parquet") {
                await this.normalizeDataSourceColumnNames(name);
            }

            const errors = await this.checkDataSourceForErrors(name);
            if (errors.length) {
                throw new Error(errors.join("</br></br>"));
            }

            if (type !== "parquet") {
                await this.addRequiredColumns(name);
            }
        }
    }

    protected async deleteDataSource(dataSource: string): Promise<void> {
        this.existingDataSources.delete(dataSource);
        this.dataSourceToAnnotationsMap.delete(dataSource);
        if (this.parquetDirectViewNames.has(dataSource)) {
            this.parquetDirectViewNames.delete(dataSource);
            await this.execute(`DROP VIEW IF EXISTS "${dataSource}"`);
        } else {
            await this.execute(`DROP TABLE IF EXISTS "${dataSource}"`);
        }
    }

    /*
        This ensures we have the columns necessary for the application to function
        MUST come after we check for errors so that we can rely on the table
        to at least be valid before modifying it further
    */
    private async addRequiredColumns(name: string): Promise<void> {
        const commandsToExecute = [
            // Add hidden UID column to uniquely identify rows
            `
                ALTER TABLE "${name}"
                ADD COLUMN ${DatabaseService.HIDDEN_UID_ANNOTATION} INT
            `,
            getUpdateHiddenUIDSQL(name),
        ];

        const dataSourceColumns = await this.getColumnsOnDataSource(name);

        /**
         * First checks if a "File Name" already exists,
         * then makes best shot attempt at auto-generating a "File Name"
         * from the "File Path", then defaults to full path if this fails.
         */
        const fileNameGenerationSQL = `
                UPDATE "${name}"
                SET "${PreDefinedColumn.FILE_NAME}" = COALESCE(
                    "${PreDefinedColumn.FILE_NAME}",
                    ${getFileNameFromPathExpression(`"${PreDefinedColumn.FILE_PATH}"`)}
                );`;
        if (!dataSourceColumns.has(PreDefinedColumn.FILE_NAME)) {
            commandsToExecute.push(`
                ALTER TABLE "${name}"
                ADD COLUMN "${PreDefinedColumn.FILE_NAME}" VARCHAR;
            `);
            commandsToExecute.push(fileNameGenerationSQL);
        } else {
            // Check for any blank "File Name" rows
            const blankFileNameRows = await this.getRowsWhereColumnIsBlank(
                name,
                PreDefinedColumn.FILE_NAME
            );
            // Some or all of the files need autogenerated names
            if (blankFileNameRows.length > 0) {
                commandsToExecute.push(fileNameGenerationSQL);
            }
        }

        await this.execute(commandsToExecute.join("; "));

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(name);
    }

    /*
        Checks the data source for unexpected formatting or issues in
        the expectations around uniqueness/blankness for pre-defined columns
        like "File Path", "File ID", etc.
    */
    private async checkDataSourceForErrors(name: string): Promise<string[]> {
        const errors: string[] = [];
        const columnsOnTable = await this.getColumnsOnDataSource(name);

        if (!columnsOnTable.has(PreDefinedColumn.FILE_PATH)) {
            let error = `"${PreDefinedColumn.FILE_PATH}" column is missing in the data source.
                Check the data source header row for a "${PreDefinedColumn.FILE_PATH}" column name and try again.`;

            // Attempt to find a column with a similar name to "File Path"
            const columns = Array.from(columnsOnTable);
            const filePathLikeColumn =
                columns.find((column) => column.toLowerCase().includes("path")) ||
                columns.find((column) => column.toLowerCase().includes("file"));
            if (filePathLikeColumn) {
                error += ` Found a column with a similar name: "${filePathLikeColumn}".`;
            }

            // Unable to determine if the file path is empty or not
            // when it is not present so return here before checking
            // for other errors
            errors.push(error);
        } else {
            // Check for empty or just whitespace File Path column values
            const blankFilePathRows = await this.getRowsWhereColumnIsBlank(
                name,
                PreDefinedColumn.FILE_PATH
            );
            if (blankFilePathRows.length > 0) {
                const rowNumbers = truncateString(blankFilePathRows.join(", "), 100);
                errors.push(
                    `"${PreDefinedColumn.FILE_PATH}" column contains ${blankFilePathRows.length} empty or purely whitespace paths at rows ${rowNumbers}.`
                );
            }
        }

        return errors;
    }

    /*
        Some columns like "File Path", "File ID", "Thumbnail", etc.
        have expectations around how they should be cased/formatted
        so this will attempt to find the nearest match to the pre-defined
        columns and format them appropriatedly
    */
    private async normalizeDataSourceColumnNames(dataSourceName: string): Promise<void> {
        const columnsOnDataSource = await this.getColumnsOnDataSource(dataSourceName);
        const actualToPreDefined = getActualToPreDefinedColumnMap([...columnsOnDataSource]);

        const combinedAlterCommands = [...actualToPreDefined.entries()]
            .map(
                ([actualColumn, preDefinedColumn]) =>
                    `ALTER TABLE "${dataSourceName}" RENAME COLUMN "${actualColumn}" TO '${preDefinedColumn}'`
            )
            .join("; ");

        if (combinedAlterCommands) {
            await this.execute(combinedAlterCommands);
        }

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(dataSourceName);
    }

    // Create a view over the parquet file that exposes columns under predefined names (e.g. "File Path")
    // and adds hidden_bff_uid.
    private async createParquetDirectView(
        viewName: string,
        parquetInternalName: string
    ): Promise<void> {
        // 1. Get original column names from the user's table.
        // Note: we don't use this.getColumnsOnDataSource, since that expects a
        // fully built data source, and this function is used for creating a
        // data source.
        const sql = new SQLBuilder().describe().from(parquetInternalName);
        const rows = await this.query(sql.toSQL()).promise;
        const rawColumns = rows.map((row) => row["column_name"] as string);
        // 2. Determine which columns need to be renamed, if any
        const actualToPreDefined = getActualToPreDefinedColumnMap(rawColumns);
        // 3. Prepare the SQL for renaming columns in the CREATE VIEW
        const selectParts = rawColumns.map((col) => {
            const preDefined = actualToPreDefined.get(col);
            if (preDefined !== undefined) {
                return `"${col}" AS "${preDefined}"`;
            }
            return `"${col}"`;
        });
        const fileNameSelectPart = getParquetFileNameSelectPart(actualToPreDefined);
        if (fileNameSelectPart !== null) {
            selectParts.push(fileNameSelectPart);
        }
        selectParts.push(`"file_row_number" AS "${DatabaseService.HIDDEN_UID_ANNOTATION}"`);
        // 4. Create the view for this data source
        const createViewSql = `CREATE VIEW "${viewName}"
            AS SELECT ${selectParts.join(", ")}
            FROM parquet_scan('${parquetInternalName}');`;
        await this.execute(createViewSql);
        this.parquetDirectViewNames.add(viewName);
    }

    private async getRowsWhereColumnIsBlank(dataSource: string, column: string): Promise<number[]> {
        const blankColumnQueryResult = await this.query(`
            SELECT A.row
            FROM (
                SELECT ROW_NUMBER() OVER () AS row, "${column}"
                FROM "${dataSource}"
            ) AS A
            WHERE TRIM(A."${column}") IS NULL
        `).promise;
        return blankColumnQueryResult.map((row) => row.row);
    }
}
