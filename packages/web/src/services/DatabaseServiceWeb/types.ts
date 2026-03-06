export enum WorkerMsgType {
    INIT = "initialize",
    CANCEL = "cancel_query",
    EXECUTE = "execute_query",
    QUERY = "query",
    SAVE = "save_query",
    ADD_SOURCE = "add_datasource",
    DELETE_SOURCE = "delete_datasource",
    ANNOTATIONS = "fetch_annotations",
    CLOSE = "close_database",
}

export enum WorkerResType {
    READY = "db ready",
    STARTED = "query started",
    SUCCESS = "success", // generic success response
    RESULT = "query result",
    SOURCE_RESOLVED = "source added or deleted",
    ERROR = "error",
}

export type Pending = {
    resolve: (value: any) => void;
    reject: (err: any) => void;
    connectionId?: number | null;
    canceledBeforeStart?: boolean;
};

export class CanceledError extends Error {
    constructor(message = "Query canceled") {
        super(message);
        this.name = "CanceledError";
    }
}

export type QueryRow = {
    [key: string]: any;
};

type WorkerMsgBase<T extends WorkerMsgType | WorkerResType, P> = {
    id: number;
    type: T;
    payload: P;
};

export type WorkerReqPayload<T extends WorkerMsgType> = {
    [WorkerMsgType.INIT]: void;
    [WorkerMsgType.CANCEL]: {
        connectionId: number;
    };
    [WorkerMsgType.EXECUTE]: {
        sql: string;
        id: string;
    };
    [WorkerMsgType.QUERY]: {
        sql: string;
        queryId: string;
    };
    [WorkerMsgType.SAVE]: {
        destination: string;
        sql: string;
        format: "parquet" | "csv" | "json";
        id: string;
    };
    [WorkerMsgType.ANNOTATIONS]: {
        dataSourceNames: string[];
        id: string;
    };
    [WorkerMsgType.ADD_SOURCE]: {
        name: string;
        type: "csv" | "json" | "parquet";
        uri: string | File;
        skipNormalization?: boolean;
    };
    [WorkerMsgType.DELETE_SOURCE]: {
        name: string;
    };
    [WorkerMsgType.CLOSE]: void;
}[T];

export type WorkerResPayload<T extends WorkerResType> = {
    [WorkerResType.READY]: void;
    [WorkerResType.STARTED]: {
        queryId: string;
        connectionId: number;
    };
    [WorkerResType.SUCCESS]: {
        result: QueryRow[];
    };
    [WorkerResType.RESULT]: {
        result: QueryRow[];
        queryId: string;
    };
    [WorkerResType.SOURCE_RESOLVED]: {
        dataSourceName: string;
        added: boolean;
    };
    [WorkerResType.ERROR]: {
        message: string;
    };
}[T];

export type WorkerRequest<T extends WorkerMsgType> = WorkerMsgBase<T, WorkerReqPayload<T>>;

export type WorkerResponse<T extends WorkerResType> = WorkerMsgBase<T, WorkerResPayload<T>>;
