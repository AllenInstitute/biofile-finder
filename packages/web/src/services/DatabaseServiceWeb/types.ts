import { ACCEPTED_SOURCE_TYPES, Source } from "../../../../core/entity/SearchParams";

export enum WorkerMsgType {
    ADD_SOURCE = "add datasource",
    ANNOTATIONS = "fetch annotations",
    CANCEL = "cancel query",
    CLOSE = "close db",
    DELETE_SOURCE = "delete datasource",
    DUMP_TIMING = "dump timing",
    EXECUTE = "execute query",
    INIT = "initialize db",
    QUERY = "run query",
    SAVE = "save query",
}

export enum WorkerResType {
    ERROR = "error",
    READY = "db ready",
    RESULT = "query result",
    SOURCE_RESOLVED = "source added or deleted",
    STARTED = "query started",
    TIMING_REPORT = "timing report",
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
    [WorkerMsgType.INIT]: { queryTiming?: boolean } | undefined;
    [WorkerMsgType.CANCEL]: {
        connectionId: number;
    };
    [WorkerMsgType.EXECUTE]: {
        id: string;
        sql: string;
    };
    [WorkerMsgType.QUERY]: {
        id: string;
        sql: string;
    };
    [WorkerMsgType.SAVE]: {
        destination: string;
        format: typeof ACCEPTED_SOURCE_TYPES[number];
        id: string;
        sql: string;
    };
    [WorkerMsgType.ANNOTATIONS]: {
        dataSourceNames: string[];
        metadataSource: Source | undefined;
        id: string;
    };
    [WorkerMsgType.ADD_SOURCE]: {
        name: string;
        type: typeof ACCEPTED_SOURCE_TYPES[number];
        uri: string | File;
        skipNormalization?: boolean;
    };
    [WorkerMsgType.DELETE_SOURCE]: {
        name: string;
    };
    [WorkerMsgType.CLOSE]: void;
    [WorkerMsgType.DUMP_TIMING]: void;
}[T];

export type WorkerResPayload<T extends WorkerResType> = {
    [WorkerResType.READY]: void;
    [WorkerResType.STARTED]: {
        connectionId: number;
        id: string;
    };
    [WorkerResType.RESULT]: {
        id: string;
        result: QueryRow[];
    };
    [WorkerResType.SOURCE_RESOLVED]: {
        dataSourceName: string;
        added: boolean;
    };
    [WorkerResType.ERROR]: {
        message: string | Error;
        id?: string;
    };
    [WorkerResType.TIMING_REPORT]: {
        timings: Record<string, number[]>;
    };
}[T];

export type WorkerRequest<T extends WorkerMsgType> = WorkerMsgBase<T, WorkerReqPayload<T>>;

export type WorkerResponse<T extends WorkerResType> = WorkerMsgBase<T, WorkerResPayload<T>>;
