import { Source } from "../../entity/FileExplorerURL";
import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

export interface DataSource extends Source {
    id: string;
    version?: number;
    created: Date;
    createdBy: string;
}

export interface PythonicDataAccessSnippet {
    code: string;
    setup: string;
}

/**
 * Service responsible for fetching dataset related metadata.
 */
export default class DataSourceService extends HttpServiceBase {
    constructor(config: ConnectionConfig = {}) {
        super(config);
    }

    /**
     * Requests for all available data sources.
     */
    public async getAll(): Promise<DataSource[]> {
        // TODO: Placeholder until infra S3 bucket is ready
        return [];
    }
}
