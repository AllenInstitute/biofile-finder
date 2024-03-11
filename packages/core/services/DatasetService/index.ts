import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import { Selection } from "../FileService/HttpFileService";
import DatabaseService from "../DatabaseService";
import DatabaseServiceNoop from "../DatabaseService/DatabaseServiceNoop";

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
    uri?: string; // TODO: INCLUDE IN TICKET - refactor properties for datasets/collections
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

interface PatchDatasetRequest {
    expiration?: Date; // Undefined is equivalent to never expiring
    private: boolean;
}

export interface PythonicDataAccessSnippet {
    code: string;
    setup: string;
}

interface DatasetConnectionConfig extends ConnectionConfig {
    database: DatabaseService;
}

// TODO: WRITE TICKET - Re-evaluate collection concept now that CSVs are present as an option, consider separating out "data sources" and "views"

/**
 * Service responsible for fetching dataset related metadata.
 */
export default class DatasetService extends HttpServiceBase {
    private static readonly ENDPOINT_VERSION = "2.0";
    public static readonly BASE_DATASET_URL = `file-explorer-service/${DatasetService.ENDPOINT_VERSION}/dataset`;
    private readonly database: DatabaseService;

    constructor(config: DatasetConnectionConfig = { database: new DatabaseServiceNoop() }) {
        super(config);
        this.database = config.database;
    }

    /**
     * Requests to create a dataset matching given specification including index-based file selection.
     * Returns the ObjectId of the Dataset document created.
     */
    public async createDataset(
        request: CreateDatasetRequest,
        currentCollection?: Dataset
    ): Promise<Dataset> {
        const postBody = JSON.stringify(request);
        let pathSuffix = "";
        if (currentCollection) {
            pathSuffix = `/${currentCollection.name}/${currentCollection.version}`;
        }
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}${pathSuffix}`;
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
     * Requests to patch the given dataset metadata matching the specification.
     * Returns the updated Dataset.
     */
    public async updateCollection(
        name: string,
        version: number,
        request: PatchDatasetRequest
    ): Promise<Dataset> {
        const patchBody = JSON.stringify(request);
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}/${name}/${version}`;
        console.log(`Requesting to perform the following update ${patchBody}`);

        const response = await this.patch<Dataset>(requestUrl, patchBody);

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(
                `Error updating dataset. Expected single dataset in response from file-explorer-service, but got ${response.data.length}.`
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
    public async getDataset(collection: {
        name: string;
        version: number;
        uri?: string;
    }): Promise<Dataset> {
        if (collection.uri) {
            const info = await this.database.getDataSource(collection.uri);
            return {
                id: info.name,
                name: info.name,
                version: 1,
                query: "",
                client: "explorer",
                fixed: true,
                private: true,
                uri: collection.uri,
                created: info.created,
                createdBy: "Unknown",
            };
        }

        // Find dataset on server
        const requestUrl = `${this.baseUrl}/${DatasetService.BASE_DATASET_URL}/${collection.name}/${collection.version}`;
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
