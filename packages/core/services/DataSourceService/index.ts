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
    private static readonly ENDPOINT_VERSION = "2.0";
    public static readonly BASE_DATASET_URL = `file-explorer-service/${DataSourceService.ENDPOINT_VERSION}/dataset`;

    constructor(config: ConnectionConfig = {}) {
        super(config);
    }

    /**
     * Requests for all available data sources.
     */
    public async getAll(): Promise<DataSource[]> {
        const requestUrl = `${this.baseUrl}/${DataSourceService.BASE_DATASET_URL}`;

        // This data should never be stale, so, avoid using a response cache
        const response = await this.getWithoutCaching<DataSource>(requestUrl);

        return response.data;
    }
}
