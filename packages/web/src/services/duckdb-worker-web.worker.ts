import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import * as duckdb from "@duckdb/duckdb-wasm";
import Annotation, { AnnotationResponse } from "../../../core/entity/Annotation";
import SQLBuilder from "../../../core/entity/SQLBuilder";
import { isEmpty } from "lodash";
import { AnnotationType } from "../../../core/entity/AnnotationFormatter";
import {
    QueryRow,
    WorkerMsgType,
    WorkerReqPayload,
    WorkerRequest,
    WorkerResPayload,
    WorkerResType,
} from "../../../core/services/DatabaseService/types";
import {
    getActualToPreDefinedColumnMap,
    getFileNameFromPathExpression,
    PreDefinedColumn,
    HIDDEN_UID_ANNOTATION,
    RAW_SUFFIX,
    SOURCE_METADATA_TABLE,
    getParquetFileNameSelectPart,
    truncateString,
    getUpdateHiddenUIDSQL,
    columnTypeToAnnotationType,
} from "../../../core/services/DatabaseService/utils";
import axios from "axios";
import DataSourcePreparationError from "../../../core/errors/DataSourcePreparationError";

declare const self: DedicatedWorkerGlobalScope & typeof globalThis;

enum DataSourceStatus {
    STARTED = "started", // started the process of creating table
    CREATED = "created", // table created but not normalized
    NORMALIZING = "normalizing", // completed normalizing
    DONE = "done",
}

const ANNOTATION_TYPE_SET = new Set(Object.values(AnnotationType));

let database: AsyncDuckDB | null = null;
// const dataSourceToProvenanceMap: Map<string, EdgeDefinition[]> = new Map();
// Data source names that are views (parquet), so we DROP VIEW on delete
const parquetDirectViewNames = new Set<string>();

// Map to track connectionNumber -> connection object
const activeConnections = new Map<number, duckdb.AsyncDuckDBConnection>();
const dataSourceToAnnotationsMap: Map<string, AnnotationResponse[]> = new Map();
const dataSourceStatusMap: Map<string, DataSourceStatus> = new Map();
// let queue: RequestQueue | undefined = undefined;

async function initDuckDB() {
    if (database) return; // Already initialized successfully
    try {
        const allBundles = duckdb.getJsDelivrBundles();

        // Selects the best bundle based on browser checks
        const bundle = await duckdb.selectBundle(allBundles);
        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
        );
        // Instantiate the asynchronous version of DuckDB-wasm
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
        database = new duckdb.AsyncDuckDB(logger, worker);
        await database.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
        self.postMessage({ type: WorkerResType.READY });
    } catch (err: any) {
        console.error(err);
        throw err;
    }
}

// Built-in DuckDB method for accessing private connection ID
function getConnectionId(connection: duckdb.AsyncDuckDBConnection): number {
    return connection.useUnsafe((_bindings: any, conn_id: number) => {
        return conn_id;
    });
}

function cancelActiveConnection(connection: duckdb.AsyncDuckDBConnection): void {
    try {
        connection.useUnsafe((bindings: any, conn_id: number) => {
            bindings.cancelPendingQuery(conn_id);
        });
    } catch (err) {
        console.error(err);
    }
}

// Query without a return value
async function execute(sql: string): Promise<void> {
    if (!database) {
        throw new Error("Database failed to initialize in execute");
    }
    const connection = await database.connect();
    const connectionId = getConnectionId(connection); // To do: Do we want to be able to cancel executes?
    activeConnections.set(connectionId, connection);
    try {
        await connection.query(sql);
    } finally {
        await connection.close();
        activeConnections.delete(connectionId);
    }
}

async function saveQuery(
    destination: string,
    sql: string,
    format: "parquet" | "csv" | "json"
): Promise<Uint8Array> {
    if (!database) {
        throw new Error("Database failed to initialize in send");
    }
    const resultName = `${destination}.${format}`;
    const formatOptions = format === "json" ? ", ARRAY true" : "";
    const finalSQL = `COPY (${sql}) TO '${resultName}' (FORMAT '${format}'${formatOptions});`;
    const connection = await database.connect();
    try {
        await connection.send(finalSQL);
        return await database.copyFileToBuffer(resultName);
    } finally {
        await connection.close();
    }
}

async function query(sql: string, queryId?: string): Promise<QueryRow[]> {
    if (!database) {
        throw "DuckDB not initialized";
    }
    const connection = await database.connect();
    // Access ID directly (not typically provided by DuckDB)
    const connectionId = getConnectionId(connection);
    activeConnections.set(connectionId, connection);

    // Tell main thread query has started; share connectionId for cancellation
    if (queryId)
        self.postMessage({ type: WorkerResType.STARTED, payload: { connectionId, queryId } });
    try {
        const result = await connection.query(sql);
        const resultAsArray = result.toArray();
        const resultAsJSONString = JSON.stringify(
            resultAsArray,
            (_, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
        );
        const resultsAsParsedJSON = JSON.parse(resultAsJSONString);
        return Promise.resolve(resultsAsParsedJSON);
    } catch (err) {
        return Promise.reject(err);
    } finally {
        await connection.close();
        activeConnections.delete(connectionId);
    }
}

async function addDataSource(
    name: string,
    type: "csv" | "json" | "parquet",
    uri: string | File
): Promise<string> {
    if (!database) {
        throw new Error("Database failed to initialize");
    }
    // Register the user's input under an internal name so we can create a
    // table or view named `name`
    const registerName = `${name}${RAW_SUFFIX}.${type}`;

    if (!dataSourceStatusMap.has(name)) {
        dataSourceStatusMap.set(name, DataSourceStatus.STARTED);
        if (uri instanceof File) {
            await database.registerFileHandle(
                registerName,
                uri,
                duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
                true
            );
        } else {
            const protocol = uri.startsWith("s3")
                ? duckdb.DuckDBDataProtocol.S3
                : duckdb.DuckDBDataProtocol.HTTP;

            await database.registerFileURL(registerName, uri, protocol, false);
        }

        if (type === "parquet") {
            await createParquetDirectView(name, registerName);
        } else if (type === "json") {
            await execute(`CREATE TABLE "${name}" AS FROM read_json_auto('${registerName}');`);
        } else {
            // Default to CSV
            await execute(
                `CREATE TABLE "${name}" AS FROM read_csv_auto('${registerName}', header=true, all_varchar=true);`
            );
        }
    }
    return Promise.resolve(name);
}

async function deleteDataSource(dataSource: string): Promise<void> {
    if (parquetDirectViewNames.has(dataSource)) {
        parquetDirectViewNames.delete(dataSource);
        await execute(`DROP VIEW IF EXISTS "${dataSource}"`);
    } else {
        await execute(`DROP TABLE IF EXISTS "${dataSource}"`);
    }
    dataSourceStatusMap.delete(dataSource);
}

async function createParquetDirectView(
    viewName: string,
    parquetInternalName: string
): Promise<void> {
    // 1. Get original column names from the user's table.
    // Note: we don't use this.getColumnsOnDataSource, since that expects a
    // fully built data source, and this function is used for creating a
    // data source.
    const sql = new SQLBuilder().describe().from(parquetInternalName);
    const rows = await query(sql.toSQL());
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
    selectParts.push(`"file_row_number" AS "${HIDDEN_UID_ANNOTATION}"`);
    // 4. Create the view for this data source
    const createViewSql = `CREATE VIEW "${viewName}"
            AS SELECT ${selectParts.join(", ")}
            FROM parquet_scan('${parquetInternalName}');`;
    await execute(createViewSql);
    parquetDirectViewNames.add(viewName);
}

async function normalizeDataSourceColumnNames(dataSourceName: string): Promise<void> {
    const columnsOnDataSource = await getColumnsOnDataSource(dataSourceName);
    const actualToPreDefined = getActualToPreDefinedColumnMap([...columnsOnDataSource]);

    const combinedAlterCommands = [...actualToPreDefined.entries()]
        .map(
            ([actualColumn, preDefinedColumn]) =>
                `ALTER TABLE "${dataSourceName}" RENAME COLUMN "${actualColumn}" TO '${preDefinedColumn}'`
        )
        .join("; ");

    if (combinedAlterCommands) {
        await execute(combinedAlterCommands);
    }

    // Because we edited the column names this cache is now invalid
    dataSourceToAnnotationsMap.delete(dataSourceName);
}

async function checkDataSourceForErrors(name: string): Promise<string[]> {
    const errors: string[] = [];
    const columnsOnTable = await getColumnsOnDataSource(name);

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
        const blankFilePathRows = await getRowsWhereColumnIsBlank(name, PreDefinedColumn.FILE_PATH);
        if (blankFilePathRows.length > 0) {
            const rowNumbers = truncateString(blankFilePathRows.join(", "), 100);
            errors.push(
                `"${PreDefinedColumn.FILE_PATH}" column contains ${blankFilePathRows.length} empty or purely whitespace paths at rows ${rowNumbers}.`
            );
        }
    }

    return errors;
}

async function getRowsWhereColumnIsBlank(dataSource: string, column: string): Promise<number[]> {
    const blankColumnQueryResult = await query(`
        SELECT A.row
        FROM (
            SELECT ROW_NUMBER() OVER () AS row, "${column}"
            FROM "${dataSource}"
        ) AS A
        WHERE TRIM(A."${column}") IS NULL
    `);
    return blankColumnQueryResult.map((row) => row.row);
}

/*
    This ensures we have the columns necessary for the application to function
    MUST come after we check for errors so that we can rely on the table
    to at least be valid before modifying it further
*/
async function addRequiredColumns(name: string): Promise<void> {
    const commandsToExecute = [
        // Add hidden UID column to uniquely identify rows
        `
            ALTER TABLE "${name}"
            ADD COLUMN ${HIDDEN_UID_ANNOTATION} INT
        `,
        getUpdateHiddenUIDSQL(name),
    ];

    const dataSourceColumns = await getColumnsOnDataSource(name);

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
        const blankFileNameRows = await getRowsWhereColumnIsBlank(name, PreDefinedColumn.FILE_NAME);
        // Some or all of the files need autogenerated names
        if (blankFileNameRows.length > 0) {
            commandsToExecute.push(fileNameGenerationSQL);
        }
    }

    await execute(commandsToExecute.join("; "));

    // Because we edited the column names this cache is now invalid
    dataSourceToAnnotationsMap.delete(name);
}

async function fetchAnnotations(
    dataSourceNames: string[],
    queryId?: string
): Promise<AnnotationResponse[]> {
    const aggregateDataSourceName = dataSourceNames.sort().join(", ");

    const hasAnnotations = dataSourceToAnnotationsMap.has(aggregateDataSourceName);
    const hasDescriptions = dataSourceToAnnotationsMap
        .get(aggregateDataSourceName)
        ?.some((annotation) => !!annotation.description);

    const shouldHaveDescriptions = dataSourceNames.includes(SOURCE_METADATA_TABLE);
    if (!hasAnnotations || (!hasDescriptions && shouldHaveDescriptions)) {
        const sql = new SQLBuilder()
            .select("column_name, data_type")
            .from('information_schema"."columns')
            .where(`table_name = '${aggregateDataSourceName}'`)
            .where(`column_name != '${HIDDEN_UID_ANNOTATION}'`)
            .toSQL();
        const rows = await query(sql, queryId);
        if (isEmpty(rows)) {
            throw new Error(`Unable to fetch annotations for ${aggregateDataSourceName}`);
        }
        const [annotationNameToDescriptionMap, annotationNameToTypeMap] = await Promise.all([
            fetchAnnotationDescriptions(),
            fetchAnnotationTypes(),
        ]);

        const annotations = rows.map(
            (row): AnnotationResponse => {
                return {
                    annotationName: row["column_name"],
                    annotationDisplayName: row["column_name"],
                    description: annotationNameToDescriptionMap[row["column_name"]] || "",
                    type:
                        (annotationNameToTypeMap[row["column_name"]] as AnnotationType) ||
                        columnTypeToAnnotationType(row["data_type"]),
                };
            }
        );

        dataSourceToAnnotationsMap.set(aggregateDataSourceName, annotations);
    }
    const result = dataSourceToAnnotationsMap.get(aggregateDataSourceName) || [];
    if (queryId) {
        self.postMessage({ type: WorkerResType.RESULT, payload: { result, queryId } });
    }
    return result;
}

async function fetchAnnotationDescriptions(): Promise<Record<string, string>> {
    // Unless we have actually added the source metadata table we can't fetch the descriptions
    if (!dataSourceStatusMap.has(SOURCE_METADATA_TABLE)) {
        console.warn("doesn't have metadata table");
        return {};
    }

    const sql = new SQLBuilder()
        .select('"Column Name", "Description"')
        .from(SOURCE_METADATA_TABLE)
        .toSQL();
    try {
        const rows = await query(sql);
        return rows.reduce(
            (map, row) => ({ ...map, [row["Column Name"]]: row["Description"] }),
            {}
        );
    } catch (err) {
        // Source metadata file may not have been supplied
        // and/or this column may not exist
        const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
        if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
            return {};
        }
        throw err;
    }
}

async function fetchAnnotationTypes(): Promise<Record<string, string>> {
    // Unless we have actually added the source metadata table we can't fetch the types
    if (!dataSourceStatusMap.has(SOURCE_METADATA_TABLE)) {
        return {};
    }

    const sql = new SQLBuilder()
        .select('"Column Name", "Type"')
        .from(SOURCE_METADATA_TABLE)
        .toSQL();

    try {
        const rows = await query(sql);
        return rows.reduce(
            (map, row) =>
                ANNOTATION_TYPE_SET.has(row["Type"])
                    ? { ...map, [row["Column Name"]]: row["Type"] }
                    : // Ignore row if invalid annotation type
                      map,
            {}
        );
    } catch (err) {
        // Source metadata file may not have been supplied
        // and/or this column may not exist
        const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
        if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
            return {};
        }
        throw err;
    }
}

async function getColumnsOnDataSource(name: string): Promise<Set<string>> {
    const rows = await fetchAnnotations([name]);
    const annotations = rows.map((row) => new Annotation(row));
    return new Set(annotations.map((annotation) => annotation.name));
}

type MessageHandler<T extends WorkerMsgType> = (
    payload: WorkerReqPayload<T>
) => Promise<WorkerResPayload<any>>; // TO DO: THis is bad

const messageHandler: { [T in WorkerMsgType]: MessageHandler<T> } = {
    [WorkerMsgType.INIT]: async () => {
        if (!database) await initDuckDB();
        return Promise.resolve();
    },
    [WorkerMsgType.CANCEL]: async ({ connectionId }) => {
        try {
            if (!database) {
                throw "DuckDB not initialized";
            }
            // Use the AsyncDuckDB.cancelSent API to interrupt the connection by id
            const connection = activeConnections.get(connectionId);
            if (connection) cancelActiveConnection(connection);
            // (self as any).postMessage({ type: 'cancel-ok', connectionNumber: connNum } as WorkerToMain);
        } catch (err: any) {
            console.warn("Failed to cancel connection", err);
            throw new Error("Failed to cancel connection: ", err);
        } finally {
            activeConnections.delete(connectionId);
        }
        return Promise.resolve({ connectionId });
    },
    [WorkerMsgType.EXECUTE]: async ({ sql, id }) => {
        // To do: decide if executes should be cancelable
        const result = await execute(sql);
        self.postMessage({ type: WorkerResType.RESULT, payload: { result, queryId: id } });
        return Promise.resolve({ result, id });
    },
    [WorkerMsgType.QUERY]: async ({ sql, queryId }) => {
        const result = await query(sql, queryId);
        self.postMessage({ type: WorkerResType.RESULT, payload: { result, queryId } });
        return Promise.resolve({ result, queryId });
    },
    [WorkerMsgType.SAVE]: async ({ destination, sql, format, id }) => {
        const result = await saveQuery(destination, sql, format);
        self.postMessage({ type: WorkerResType.RESULT, payload: { result, queryId: id } });
        return Promise.resolve({ result, id });
    },
    [WorkerMsgType.ANNOTATIONS]: async ({ dataSourceNames, id }) => {
        await fetchAnnotations(dataSourceNames, id);
        return Promise.resolve();
    },
    [WorkerMsgType.ADD_SOURCE]: async ({ name, type, uri, skipNormalization = false }) => {
        try {
            const dataSourceName = await addDataSource(name, type, uri);
            if (!dataSourceStatusMap.has(name)) {
                throw `Table with data source ${name} does not exist`;
            }
            if (dataSourceStatusMap.get(name) === DataSourceStatus.STARTED) {
                if (!skipNormalization) {
                    dataSourceStatusMap.set(name, DataSourceStatus.NORMALIZING);
                    if (type !== "parquet") {
                        await normalizeDataSourceColumnNames(name);
                    }

                    const errors = await checkDataSourceForErrors(name);
                    if (errors.length) {
                        throw new Error(errors.join("</br></br>"));
                    }

                    if (type !== "parquet") {
                        await addRequiredColumns(name);
                    }
                }
                dataSourceStatusMap.set(name, DataSourceStatus.DONE);
                self.postMessage({
                    type: WorkerResType.SOURCE_RESOLVED,
                    payload: { dataSourceName: name, added: true },
                });
            } else {
                // Another process has already initiated data source, so currently in duplicate call
            }
            return Promise.resolve({ dataSourceName, skipNormalization });
        } catch (err) {
            let formattedError = (err as Error).message;
            // DuckDB does not provide informative server errors, so send a
            // separate 'get' call to retrieve error messages for URL data sources
            if (!(uri instanceof File)) {
                await axios.get(uri).catch((error) => {
                    // Error responses can be formatted differently
                    // Get progressively less specific in where we look for the message
                    if (error?.response) {
                        formattedError = `Request failed with status ${error.response.status}: ${
                            error.response?.data?.error ||
                            error.response?.data?.message ||
                            error.response?.statusText ||
                            error.response.data
                        }`;
                    } else if (error?.message) {
                        formattedError = error.message;
                    } // else use default error message
                });
            }
            await deleteDataSource(name);
            throw new DataSourcePreparationError(formattedError, name);
        }
    },
    [WorkerMsgType.DELETE_SOURCE]: async ({ name }) => {
        try {
            await deleteDataSource(name);
            self.postMessage({
                type: WorkerResType.SOURCE_RESOLVED,
                payload: { dataSourceName: name, added: false },
            });
        } catch (err) {
            throw err;
        }
    },
    [WorkerMsgType.CLOSE]: async () => {
        activeConnections.clear();
        database?.detach();
    },
};

self.onmessage = async <T extends WorkerMsgType>({ data }: MessageEvent<WorkerRequest<T>>) => {
    try {
        await messageHandler[data.type](data.payload);
    } catch (err) {
        console.error(data, err);
        self.postMessage({ ...data, type: WorkerResType.ERROR, payload: (err as Error).message });
    }
    return;
};

//  To do: error handling
self.onerror = (e) => {
    console.error("Calling on error from worker", e);
};
