import HttpServiceBase from "../HttpServiceBase";
import { Selection } from "../FileService";

export interface CreateDatasetRequest {
    name: string;
    annotations: string[];
    expiration?: Date; // Undefined is equivalent to never expiring TODO: Double check the whole UTC thing
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
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}`;
        console.log(`Requesting to create the following dataset ${request}`);

        const response = await this.post<string>(requestUrl, JSON.stringify(request));

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(`Expected response.data of ${request} to contain a single count`);
        }
        return response.data[0];
    }
}
