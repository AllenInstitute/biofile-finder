import { uniqueId } from "lodash";

import { AICS_FMS_DATA_SOURCE_NAME } from "../../../../core/constants";
import Annotation, { AnnotationResponse } from "../../../../core/entity/Annotation";
import { Source } from "../../../../core/entity/SearchParams";
import {
    CanceledError,
    Pending,
    WorkerMsgType,
    WorkerResPayload,
    WorkerResponse,
    WorkerResType,
} from "./types";
import { DatabaseService } from "../../../../core/services";

export default class DatabaseServiceWeb extends DatabaseService {
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);

    public worker: Worker;
    protected dbPromise: any;
    protected dbInitialized = new Promise((resolve, _reject) => {
        this.dbPromise = resolve;
    });
    protected ready = false;
    public pending = new Map<string, Pending>();
    private pendingSources = new Map<string, Pending>();

    constructor() {
        super();
        this.worker = new Worker(new URL("./duckdb-worker.worker", import.meta.url), {
            type: "module",
        });
        this.worker.onmessage = this.onMessage.bind(this);
        this.worker.onerror = (e: any) => {
            // propagate to all pending queries
            for (const [id, p] of this.pending) {
                p.reject(new Error(`Worker error: ${e?.message ?? "unknown"}`));
                this.pending.delete(id);
            }
        };
    }

    public async initialize() {
        this.worker.postMessage({ type: WorkerMsgType.INIT });
        await this.dbInitialized;
    }

    public async saveQuery(
        destination: string,
        sql: string,
        format: "parquet" | "csv" | "json"
    ): Promise<Uint8Array> {
        if (!this.ready) {
            throw new Error("Database failed to initialize in save query");
        }
        const queryId = `save-${Date.now()}-${uniqueId()}`;
        const promise = new Promise<any>((resolve, reject) => {
            this.pending.set(queryId, {
                resolve,
                reject,
                connectionId: undefined,
                canceledBeforeStart: false,
            });

            try {
                this.worker.postMessage({
                    type: WorkerMsgType.SAVE,
                    payload: { destination, sql, format, id: queryId },
                });
            } catch (err) {
                // Synchronous postMessage failure -> reject and clean up
                this.pending.delete(queryId);
                reject(new Error("Failed to post query to worker: " + String(err)));
            }
        });
        return promise;
    }

    public query(
        sql: string
    ): { promise: Promise<{ [key: string]: any }[]>; cancel?: (reason?: string) => void } {
        if (!this.ready) {
            throw new Error(`Database failed to initialize in query with ${sql}`);
        }
        const queryId = `q-${Date.now()}-${uniqueId()}`;
        let settled = false;
        const promise = new Promise<any>((resolve, reject) => {
            this.pending.set(queryId, {
                resolve,
                reject,
                connectionId: undefined,
                canceledBeforeStart: false,
            });

            try {
                this.worker.postMessage({
                    type: WorkerMsgType.QUERY,
                    payload: { sql, id: queryId },
                });
            } catch (err) {
                // Synchronous postMessage failure -> reject and clean up
                this.pending.delete(queryId);
                reject(new Error("Failed to post query to worker: " + String(err)));
            }
        });
        const cancel = (reason?: string) => {
            if (settled) return;
            const p = this.pending.get(queryId);
            if (!p) return;
            if (typeof p.connectionId === "number") {
                this.worker.postMessage({
                    type: WorkerMsgType.CANCEL,
                    payload: { connectionId: p.connectionId },
                });
                settled = true;
                p.reject(new CanceledError(reason ?? "Canceled by user"));
                this.pending.delete(queryId);
                return;
            } else {
                p.canceledBeforeStart = true;
                settled = true;
                p.reject(new CanceledError(reason ?? "Canceled by user (before start)"));
                this.pending.delete(queryId);
                return;
            }
        };

        const wrappedPromise = promise.finally(() => {
            settled = true;
        });

        return { promise: wrappedPromise, cancel };
    }

    public close() {
        this.worker.postMessage({ type: WorkerMsgType.CLOSE });
        this.worker.terminate();
        // Remove all pending queries
        for (const [id, p] of this.pending) {
            p.reject(new Error("DatabaseService closed"));
            this.pending.delete(id);
        }
    }

    public async execute(sql: string): Promise<void> {
        if (!this.ready) {
            throw new Error(`Database failed to initialize in query with ${sql}`);
        }
        const id = `e-${Date.now()}-${uniqueId()}`;
        const promise = new Promise<any>((resolve, reject) => {
            this.pending.set(id, {
                resolve,
                reject,
                connectionId: undefined,
                canceledBeforeStart: false,
            });

            try {
                this.worker.postMessage({ type: WorkerMsgType.EXECUTE, payload: { sql, id } });
            } catch (err) {
                // Synchronous postMessage failure -> reject and clean up
                this.pending.delete(id);
                reject(new Error("Failed to post query to worker: " + String(err)));
            }
        });
        return promise;
    }

    protected async prepareDataSource(
        dataSource: Source,
        skipNormalization: boolean
    ): Promise<void> {
        const { name, type, uri } = dataSource;
        const promise = new Promise<any>((resolve, reject) => {
            this.pendingSources.set(name, { resolve, reject });
            this.worker.postMessage({
                type: WorkerMsgType.ADD_SOURCE,
                payload: { name, type, uri, skipNormalization },
            });
        });
        return promise;
    }

    protected async deleteDataSource(dataSource: string): Promise<void> {
        const promise = new Promise<any>((resolve, reject) => {
            this.pendingSources.set(dataSource, { resolve, reject });
            this.worker.postMessage({
                type: WorkerMsgType.DELETE_SOURCE,
                payload: { name: dataSource },
            });
        });
        const wrappedPromise = promise.finally(() => {
            this.existingDataSources.delete(dataSource);
            this.dataSourceToAnnotationsMap.delete(dataSource);
        });
        return wrappedPromise;
    }

    public async fetchAnnotations(dataSourceNames: string[]): Promise<Annotation[]> {
        if (!this.ready) {
            throw new Error("Database failed to initialize in fetchAnnotations");
        }
        const id = `ann-${Date.now()}-${uniqueId()}`;
        const promise = new Promise<AnnotationResponse[]>((resolve, reject) => {
            this.pending.set(id, {
                resolve,
                reject,
                connectionId: undefined,
                canceledBeforeStart: false,
            });

            try {
                this.worker.postMessage({
                    type: WorkerMsgType.ANNOTATIONS,
                    payload: { dataSourceNames, id },
                });
            } catch (err) {
                // Synchronous postMessage failure -> reject and clean up
                this.pending.delete(id);
                reject(new Error("Failed to post query to worker: " + String(err)));
            }
        });
        const wrappedPromise = promise.then((result) =>
            result.map((row) => {
                return new Annotation(row);
            })
        );

        return wrappedPromise;
    }

    // Receive message from the worker
    public onMessage<T extends WorkerResType>({ data }: MessageEvent<WorkerResponse<T>>): void {
        if (!data || typeof data !== "object") return;

        switch (data.type) {
            case WorkerResType.READY: {
                this.ready = true;
                this.dbPromise();
                return;
            }
            case WorkerResType.STARTED: {
                const { id, connectionId } = data.payload as WorkerResPayload<
                    WorkerResType.STARTED
                >;
                const p = this.pending.get(id);
                if (!p) return;
                p.connectionId = connectionId;
                if (p.canceledBeforeStart) {
                    // send cancel now we know the conn number
                    try {
                        this.worker.postMessage({
                            type: WorkerMsgType.CANCEL,
                            payload: { connectionId: p.connectionId },
                        });
                        this.pending.delete(id);
                    } catch (err) {
                        console.error(err);
                    }
                }
                return;
            }
            case WorkerResType.RESULT: {
                const { id, result } = data.payload as WorkerResPayload<WorkerResType.RESULT>;
                const p = this.pending.get(id);
                if (!p) return;
                p.resolve(result);
                this.pending.delete(id);
                return;
            }
            case WorkerResType.SOURCE_RESOLVED: {
                const { dataSourceName, added } = data.payload as WorkerResPayload<
                    WorkerResType.SOURCE_RESOLVED
                >;
                // Add or remove data source name from in-memory set
                // for quick data source checks
                if (added) this.existingDataSources.add(dataSourceName);
                else this.existingDataSources.delete(dataSourceName);
                const source = this.pendingSources.get(dataSourceName);
                if (!source) return;
                source.resolve(source);
                this.pendingSources.delete(dataSourceName);
                return;
            }
            case WorkerResType.ERROR: {
                const { message, id } = data.payload as WorkerResPayload<WorkerResType.ERROR>;
                if (id) {
                    const p = this.pending.get(id);
                    if (!p) return;
                    p.reject(message);
                    this.pending.delete(id);
                }
                console.error("Error in web worker: ", message);
                return;
            }
            default:
                return;
        }
    }
}
