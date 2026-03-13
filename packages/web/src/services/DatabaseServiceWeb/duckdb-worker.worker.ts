import * as duckdb from "@duckdb/duckdb-wasm";
import axios from "axios";
import { isEmpty } from "lodash";

import { QueryRow, WorkerMsgType, WorkerReqPayload, WorkerRequest, WorkerResType } from "./types";
import Annotation, { AnnotationResponse } from "../../../../core/entity/Annotation";
import { AnnotationType } from "../../../../core/entity/AnnotationFormatter";
import { Source } from "../../../../core/entity/SearchParams";
import SQLBuilder from "../../../../core/entity/SQLBuilder";
import { HIDDEN_UID_ANNOTATION } from "../../../../core/constants";
import DataSourcePreparationError from "../../../../core/errors/DataSourcePreparationError";
import { DatabaseService } from "../../../../core/services";

declare const self: DedicatedWorkerGlobalScope & typeof globalThis;
let databaseService: DatabaseServiceWebWorker | null = null;

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
    [WorkerMsgType.INIT]: async () => {
        if (!databaseService) await initDuckDB();
        self.postMessage({ type: WorkerResType.READY });
    },
    [WorkerMsgType.CANCEL]: async ({ connectionId }) => {
        try {
            if (!databaseService) {
                throw "DuckDB not initialized";
            }
            // Use the AsyncDuckDB.cancelSent API to interrupt the connection by id
            const connection = activeConnections.get(connectionId);
            if (connection) cancelActiveConnection(connection);
        } catch (err: any) {
            throw new Error("Failed to cancel connection: ", err);
        } finally {
            activeConnections.delete(connectionId);
        }
    },
    [WorkerMsgType.EXECUTE]: async ({ sql, id }) => {
        if (!databaseService) {
            throw "DuckDB not initialized";
        }
        // To do: decide if executes should be cancelable
        const result = await databaseService.execute(sql);
        self.postMessage({ type: WorkerResType.RESULT, payload: { result, id } });
    },
    [WorkerMsgType.QUERY]: async ({ sql, id }) => {
        try {
            if (!databaseService) {
                throw "DuckDB not initialized";
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
                throw "DuckDB not initialized";
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
                throw "DuckDB not initialized";
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
            throw "DuckDB not initialized";
        }
        // reconstruct source object
        const dataSource = { name, type, uri };
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
        try {
            const dataSourceName = await databaseService.prepareDataSourceWorker(
                dataSource,
                skipNormalization
            );
            return self.postMessage({
                type: WorkerResType.SOURCE_RESOLVED,
                payload: { dataSourceName, added: true },
            });
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
            await databaseService.deleteDataSourceWrapper(name);
            const errorObj = new DataSourcePreparationError(formattedError, name);
            self.postMessage({
                type: WorkerResType.ERROR,
                payload: { message: errorObj, id: name },
            });
            throw errorObj;
        }
    },
    [WorkerMsgType.DELETE_SOURCE]: async ({ name }) => {
        if (!databaseService) {
            throw "DuckDB not initialized";
        }
        try {
            await databaseService.deleteDataSourceWrapper(name);
            return self.postMessage({
                type: WorkerResType.SOURCE_RESOLVED,
                payload: { dataSourceName: name, added: false },
            });
        } catch (err: any) {
            throw new Error("Failed to delete source: ", err);
        }
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
            const allBundles = duckdb.getJsDelivrBundles();

            // Selects the best bundle based on browser checks
            const bundle = await duckdb.selectBundle(allBundles);
            const worker_url = URL.createObjectURL(
                new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
            );
            // Instantiate the asynchronous version of DuckDB-wasm
            const worker = new Worker(worker_url);
            const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
            this.database = new duckdb.AsyncDuckDB(logger, worker);
            await this.database.instantiate(bundle.mainModule, bundle.pthreadWorker);
            URL.revokeObjectURL(worker_url);
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

    async prepareDataSourceWorker(dataSource: Source, skipNormalization: boolean): Promise<string> {
        await this.prepareDataSource(dataSource, skipNormalization);
        self.postMessage({
            type: WorkerResType.SOURCE_RESOLVED,
            payload: { dataSourceName: dataSource.name, added: true },
        });
        return Promise.resolve(dataSource.name);
    }

    public query(
        sql: string
    ): { promise: Promise<QueryRow[]>; cancel?: (reason?: string) => void } {
        return { promise: this.queryWorker(sql) };
    }

    public async queryWorker(sql: string, queryId?: string): Promise<QueryRow[]> {
        if (!this.database) {
            throw "DuckDB not initialized";
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
