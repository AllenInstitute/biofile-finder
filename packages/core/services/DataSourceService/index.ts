import { Source } from "../../entity/SearchParams";

/**
 * Stub retained for the `DataSource` type shape. The real network-backed
 * DatasetService has been removed in the simplified build.
 */
export interface DataSource extends Source {
    id: string;
    version?: number;
}

export interface PythonicDataAccessSnippet {
    code: string;
    setup: string;
}
