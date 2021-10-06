import HttpServiceBase from "../HttpServiceBase";
import { Selection } from "../FileService";

export interface Dataset {
    id: string;
    name: string;
    annotations?: string[];
    version: number;
    expiration?: Date;
    collection?: string; // When fixed Dataset should not point to a collection
    query: string;
    client: string;
    fixed: boolean;
    private: boolean;
    created: Date;
    createdBy: string;
}

export interface CreateDatasetRequest {
    name: string;
    annotations?: string[]; // Undefined is equivalent to all annotations
    expiration?: Date; // Undefined is equivalent to never expiring
    fixed: boolean;
    private: boolean;
    selections: Selection[];
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

    /**
     * Requests to create a dataset matching given specification including index-based file selection.
     * Returns the ObjectId of the Dataset document created.
     */
    public async createDataset(request: CreateDatasetRequest): Promise<Dataset> {
        const postBody = JSON.stringify(request);
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}`;
        console.log(`Requesting to create the following dataset ${postBody}`);

        const response = await this.post<Dataset>(requestUrl, postBody);

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(
                `Error creating dataset. Expected single dataset in response from file-explorer-service, but got ${response.data.length}.`
            );
        }
        return response.data[0];
    }

    /**
     * Requests for all available (e.g., non-expired) datasets.
     */
    public async getDatasets(): Promise<Dataset[]> {
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}`;
        console.log(`Requesting all datasets from the following url: ${requestUrl}`);

        // This data should never be stale, so, avoid using a response cache
        const response = await this.getWithoutCaching<Dataset>(requestUrl);

        return response.data;
    }

    /**
     * Request for a specific dataset.
     */
    public async getDataset(name: string, version: number): Promise<Dataset> {
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}/${name}/${version}`;
        console.log(`Requesting dataset from the following url: ${requestUrl}`);

        // This data should never be stale, so, avoid using a response cache
        const response = await this.getWithoutCaching<Dataset>(requestUrl);

        return response.data[0];
    }

    public async getPythonicDataAccessSnippet(
        datasetName: string,
        datasetVersion: number
    ): Promise<PythonicDataAccessSnippet> {
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}/${encodeURIComponent(
            datasetName
        )}/${datasetVersion}/pythonSnippet`;
        console.log(`Requesting Python snippet for accessing dataset at: ${requestUrl}`);

        const response = await this.get<PythonicDataAccessSnippet>(requestUrl);

        if (response.data.length !== 1) {
            throw new Error(`Unexpected number of Python snippets received from ${requestUrl}`);
        }

        return response.data[0];
    }
}
