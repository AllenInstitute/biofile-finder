import HttpServiceBase from "../HttpServiceBase";
import { Selection } from "../FileService";

export interface Dataset {
    name: string;
    version: number;
    expiration?: Date;
    collection: string;
    query: string;
    createdBy: string;
    created: Date;
    client: string;
}

export interface CreateDatasetRequest {
    name: string;
    annotations: string[];
    expiration?: Date; // Undefined is equivalent to never expiring
    selections: Selection[];
}

/**
 * Service responsible for fetching dataset related metadata.
 */
export default class DatasetService extends HttpServiceBase {
    public static readonly DATASET_ENDPOINT_VERSION = "1.0";
    public static readonly BASE_DATASET_URL = `file-explorer-service/${DatasetService.DATASET_ENDPOINT_VERSION}/dataset`;

    /**
     * Requests to create a dataset matching given specification including index-based file selection.
     * Returns the ObjectId of the Dataset document created.
     */
    public async createDataset(request: CreateDatasetRequest): Promise<string> {
        const postBody = JSON.stringify(request);
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}`;
        console.log(`Requesting to create the following dataset ${postBody}`);

        const response = await this.post<string>(requestUrl, postBody);

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(`Expected response.data of ${postBody} to contain a single count`);
        }
        return response.data[0];
    }

    /**
     * Requests for all datasets in the FMS MongoDB dataset collection
     */
    public async getDatasets(): Promise<Dataset[]> {
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}`;
        console.log(`Requesting all datasets from the following url: ${requestUrl}`);

        const response = await this.get<Dataset>(requestUrl);

        return response.data;
    }
}
