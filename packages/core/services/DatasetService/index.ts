import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";

export interface Dataset {
    id: string;
    name: string;
    annotations?: string[];
    version?: number;
    expiration?: Date;
    collection?: string; // When fixed Dataset should not point to a collection
    data?: ArrayBuffer;
    query?: string;
    client?: string;
    fixed?: boolean;
    uri?: string | File;
    private?: boolean;
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
export default class DatasetService extends HttpServiceBase {
    private static readonly ENDPOINT_VERSION = "2.0";
    public static readonly BASE_DATASET_URL = `file-explorer-service/${DatasetService.ENDPOINT_VERSION}/dataset`;

    constructor(config: ConnectionConfig = {}) {
        super(config);
    }

    /**
     * Requests for all available (e.g., non-expired) datasets.
     */
    public async getDatasets(): Promise<Dataset[]> {
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}`;

        // This data should never be stale, so, avoid using a response cache
        const response = await this.getWithoutCaching<Dataset>(requestUrl);

        return response.data;
    }

    public async getPythonicDataAccessSnippet(
        datasetName: string,
        datasetVersion?: number
    ): Promise<PythonicDataAccessSnippet> {
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}/${encodeURIComponent(
            datasetName
        )}/${datasetVersion}/pythonSnippet`;

        const response = await this.get<PythonicDataAccessSnippet>(requestUrl);

        if (response.data.length !== 1) {
            throw new Error(`Unexpected number of Python snippets received from ${requestUrl}`);
        }

        return response.data[0];
    }
}
