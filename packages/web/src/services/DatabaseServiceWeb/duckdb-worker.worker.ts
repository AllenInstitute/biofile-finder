import * as duckdb from "@duckdb/duckdb-wasm";
import { isEmpty } from "lodash";

import { QueryRow, WorkerMsgType, WorkerReqPayload, WorkerRequest, WorkerResType } from "./types";
import Annotation, { AnnotationResponse } from "../../../../core/entity/Annotation";
import { AnnotationType } from "../../../../core/entity/AnnotationFormatter";
import { Source } from "../../../../core/entity/SearchParams";
import SQLBuilder from "../../../../core/entity/SQLBuilder";
import { HIDDEN_UID_ANNOTATION } from "../../../../core/constants";
import DataSourcePreparationError from "../../../../core/errors/DataSourcePreparationError";
import { DatabaseService } from "../../../../core/services";
import { initializeDuckDB } from "../../../../core/services/DatabaseService";

declare const self: DedicatedWorkerGlobalScope & typeof globalThis;
let databaseService: DatabaseServiceWebWorker | null = null;
let queryTimingEnabled = false;
const accumulatedTimings = new Map<string, number[]>();

// Map to track connectionNumber -> connection object
const activeConnections = new Map<number, duckdb.AsyncDuckDBConnection>();

async function initDuckDB() {
    if (databaseService) return; // Already initialized successfully
    try {
        databaseService = new DatabaseServiceWebWorker();
        await databaseService.initialize();
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
    connection.useUnsafe((bindings: any, conn_id: number) => {
        bindings.cancelPendingQuery(conn_id);
    });
}

type MessageHandler<T extends WorkerMsgType> = (payload: WorkerReqPayload<T>) => Promise<void>;

const messageHandler: { [T in WorkerMsgType]: MessageHandler<T> } = {
    [WorkerMsgType.INIT]: async (payload) => {
        queryTimingEnabled = payload?.queryTiming ?? false;
        if (!databaseService) await initDuckDB();
        self.postMessage({ type: WorkerResType.READY });
    },
    [WorkerMsgType.CANCEL]: async ({ connectionId }) => {
        try {
            if (!databaseService) {
                throw new Error("DuckDB not initialized");
            }
            // Use the AsyncDuckDB.cancelSent API to interrupt the connection by id
            const connection = activeConnections.get(connectionId);
            if (connection) cancelActiveConnection(connection);
        } catch (err) {
            throw new Error(`Failed to cancel connection: ${err}`);
        } finally {
            activeConnections.delete(connectionId);
        }
    },
    [WorkerMsgType.EXECUTE]: async ({ sql, id }) => {
        try {
            if (!databaseService) {
                throw new Error("DuckDB not initialized");
            }
            // To do: decide if executes should be cancelable
            const result = await databaseService.execute(sql);
            self.postMessage({ type: WorkerResType.RESULT, payload: { result, id } });
        } catch (err) {
            // post error with ID so parent class can reject pending
            self.postMessage({
                type: WorkerResType.ERROR,
                payload: { message: (err as Error).message, id },
            });
        }
    },
    [WorkerMsgType.QUERY]: async ({ sql, id }) => {
        try {
            if (!databaseService) {
                throw new Error("DuckDB not initialized");
            }
            const result = await databaseService.queryWorker(sql, id);
            self.postMessage({ type: WorkerResType.RESULT, payload: { result, id } });
        } catch (err) {
            // post error with ID so parent class can cancel pending query
            self.postMessage({
                type: WorkerResType.ERROR,
                payload: { message: (err as Error).message, id },
            });
        }
    },
    [WorkerMsgType.SAVE]: async ({ destination, sql, format, id }) => {
        try {
            if (!databaseService) {
                throw new Error("DuckDB not initialized");
            }
            const result = await databaseService.saveQuery(destination, sql, format);
            self.postMessage({ type: WorkerResType.RESULT, payload: { result, id } });
        } catch (err) {
            // post error with ID so parent class can cancel pending query
            self.postMessage({
                type: WorkerResType.ERROR,
                payload: { message: (err as Error).message, id },
            });
        }
    },
    [WorkerMsgType.ANNOTATIONS]: async ({ dataSourceNames, id }) => {
        try {
            if (!databaseService) {
                throw new Error("DuckDB not initialized");
            }
            const rows = await databaseService.fetchAnnotationsWorker(dataSourceNames, id);
            // Annotation rows need to be converted into flat AnnotationResponse objects for worker
            // since message cannot contain functions
            const result: AnnotationResponse[] = rows.map(
                (row): AnnotationResponse => {
                    return {
                        annotationName: row.name,
                        annotationDisplayName: row.displayName,
                        description: row.description,
                        type: row.type as AnnotationType,
                    };
                }
            );
            return self.postMessage({ type: WorkerResType.RESULT, payload: { result, id } });
        } catch (err) {
            // post error with ID so parent class can cancel pending query
            self.postMessage({
                type: WorkerResType.ERROR,
                payload: { message: (err as Error).message, id },
            });
        }
    },
    [WorkerMsgType.ADD_SOURCE]: async ({ name, type, uri, skipNormalization = false }) => {
        if (!databaseService) {
            throw new Error("DuckDB not initialized");
        }
        // reconstruct source object
        const dataSource = { name, type, uri };
        try {
            await databaseService.prepareDataSourceWorker(dataSource, skipNormalization);
            return self.postMessage({
                type: WorkerResType.SOURCE_RESOLVED,
                payload: { dataSourceName: name, added: true },
            });
        } catch (err) {
            await databaseService.deleteDataSourceWrapper(name);
            const errorObj = new DataSourcePreparationError((err as Error).message, name);
            self.postMessage({
                type: WorkerResType.ERROR,
                payload: { message: errorObj, id: name },
            });
            throw errorObj;
        }
    },
    [WorkerMsgType.DELETE_SOURCE]: async ({ name }) => {
        if (!databaseService) {
            throw new Error("DuckDB not initialized");
        }
        try {
            await databaseService.deleteDataSourceWrapper(name);
            return self.postMessage({
                type: WorkerResType.SOURCE_RESOLVED,
                payload: { dataSourceName: name, added: false },
            });
        } catch (err) {
            throw new Error(`Failed to delete source: ${err}`);
        }
    },
    [WorkerMsgType.DUMP_TIMING]: async () => {
        const timings: Record<string, number[]> = {};
        accumulatedTimings.forEach((values, key) => {
            timings[key] = values;
        });
        self.postMessage({ type: WorkerResType.TIMING_REPORT, payload: { timings } });
    },
    [WorkerMsgType.CLOSE]: async () => {
        if (!databaseService) {
            return;
        }
        activeConnections.clear();
        databaseService.close();
        databaseService = null;
        return Promise.resolve();
    },
};

self.onmessage = async <T extends WorkerMsgType>({ data }: MessageEvent<WorkerRequest<T>>) => {
    try {
        await messageHandler[data.type](data.payload);
    } catch (err) {
        self.postMessage({
            ...data,
            type: WorkerResType.ERROR,
            payload: { message: (err as Error).message },
        });
    }
    return;
};

self.onerror = (ev) => {
    self.postMessage({ type: WorkerResType.ERROR, payload: { message: ev } });
};

export default class DatabaseServiceWebWorker extends DatabaseService {
    async initialize() {
        if (this.database) return; // Already initialized successfully
        try {
            this.database = await initializeDuckDB(duckdb.LogLevel.WARNING);
            return Promise.resolve();
        } catch (err: any) {
            console.error(err);
            throw err;
        }
    }

    // Query without a return value
    async execute(sql: string): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize in execute");
        }
        const connection = await this.database.connect();
        const connectionId = getConnectionId(connection); // To do: Do we want to be able to cancel executes?
        activeConnections.set(connectionId, connection);
        try {
            await connection.query(sql);
        } finally {
            await connection.close();
            activeConnections.delete(connectionId);
        }
    }

    // public wrapper so that the worker can access the function
    public async prepareDataSourceWorker(
        dataSource: Source,
        skipNormalization: boolean
    ): Promise<void> {
        await this.prepareDataSource(dataSource, skipNormalization);
    }

    public query(
        sql: string
    ): { promise: Promise<QueryRow[]>; cancel?: (reason?: string) => void } {
        return { promise: this.queryWorker(sql) };
    }

    public async queryWorker(sql: string, queryId?: string): Promise<QueryRow[]> {
        if (!this.database) {
            throw new Error("DuckDB not initialized");
        }
        const connection = await this.database.connect();
        // Access ID directly (not typically provided by DuckDB)
        const connectionId = getConnectionId(connection);
        activeConnections.set(connectionId, connection);

        // Tell main thread query has started; share connectionId for cancellation
        if (queryId)
            self.postMessage({
                type: WorkerResType.STARTED,
                payload: { connectionId, id: queryId },
            });
        const t0 = queryTimingEnabled ? performance.now() : 0;
        try {
            const result = await connection.query(sql);
            if (queryTimingEnabled) {
                const elapsed = performance.now() - t0;
                const labelMatch = sql.match(/^--\s*(.+)\n/);
                const label = labelMatch ? labelMatch[1].trim() : "query";
                const existing = accumulatedTimings.get(label) ?? [];
                accumulatedTimings.set(label, [...existing, elapsed]);
                const body = sql
                    .replace(/^--[^\n]*\n/, "")
                    .replace(/\s+/g, " ")
                    .slice(0, 100);
                console.log(`[duckdb] ${elapsed.toFixed(1)}ms — [${label}] ${body}`);
            }

            // Apache Arrow JS (used by duckdb-wasm) only reads the first 8 bytes, losing the nanoseconds.
            // Re-run with INTERVAL columns cast to ms integers so the data survives Arrow.
            const intervalFields = result.schema.fields.filter((f) => f.typeId === 11);
            const finalResult =
                intervalFields.length > 0
                    ? await connection.query(
                          `SELECT ${result.schema.fields
                              .map((f) =>
                                  intervalFields.some((iv) => iv.name === f.name)
                                      ? `CAST(EXTRACT(epoch FROM "${f.name}") * 1000 AS BIGINT) AS "${f.name}"`
                                      : `"${f.name}"`
                              )
                              .join(", ")} FROM (${sql})`
                      )
                    : result;
            const resultAsArray = finalResult.toArray();
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

    public enableQueryTiming(): void {
        queryTimingEnabled = true;
    }

    public clearAnnotationCache(sourceName: string): void {
        this.dataSourceToAnnotationsMap.delete(sourceName);
    }

    public clearTimings(): void {
        accumulatedTimings.clear();
    }

    /** Sum of all accumulated DuckDB query times across all labels since last clearTimings(). */
    public sumTimings(): number {
        let total = 0;
        accumulatedTimings.forEach((values) => {
            total += values.reduce((a, b) => a + b, 0);
        });
        return total;
    }

    // public wrapper so that the worker can access the function
    public async deleteDataSourceWrapper(dataSource: string): Promise<void> {
        this.deleteDataSource(dataSource);
    }

    public async fetchAnnotations(dataSourceNames: string[]): Promise<Annotation[]> {
        return await this.fetchAnnotationsWorker(dataSourceNames);
    }

    // Custom method to allow us to take an id and call the worker version of query; otherwise the same as parent fn
    public async fetchAnnotationsWorker(
        dataSourceNames: string[],
        id?: string
    ): Promise<Annotation[]> {
        const aggregateDataSourceName = dataSourceNames.sort().join(", ");

        const hasAnnotations = this.dataSourceToAnnotationsMap.has(aggregateDataSourceName);
        const hasDescriptions = this.dataSourceToAnnotationsMap
            .get(aggregateDataSourceName)
            ?.some((annotation) => !!annotation.description);

        const shouldHaveDescriptions = dataSourceNames.includes(this.SOURCE_METADATA_TABLE);
        if (!hasAnnotations || (!hasDescriptions && shouldHaveDescriptions)) {
            const sql = new SQLBuilder()
                .select("column_name, data_type")
                .from('information_schema"."columns')
                .where(`table_name = '${aggregateDataSourceName}'`)
                .where(`column_name != '${HIDDEN_UID_ANNOTATION}'`)
                .toSQL();
            const rows = await this.queryWorker(sql, id);
            if (isEmpty(rows)) {
                throw new Error(`Unable to fetch annotations for ${aggregateDataSourceName}`);
            }
            const [annotationNameToDescriptionMap, annotationNameToTypeMap] = await Promise.all([
                this.fetchAnnotationDescriptions(),
                this.fetchAnnotationTypes(),
            ]);

            const annotations = rows.map(
                (row) =>
                    new Annotation({
                        annotationName: row["column_name"],
                        annotationDisplayName: row["column_name"],
                        description: annotationNameToDescriptionMap[row["column_name"]] || "",
                        type:
                            (annotationNameToTypeMap[row["column_name"]] as AnnotationType) ||
                            DatabaseServiceWebWorker.columnTypeToAnnotationType(row["data_type"]),
                    })
            );
            this.dataSourceToAnnotationsMap.set(aggregateDataSourceName, annotations);
        }
        return this.dataSourceToAnnotationsMap.get(aggregateDataSourceName) || [];
    }
}
