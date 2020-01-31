import axios, { AxiosInstance } from "axios";

import { FLAT_FILE_DATA_SOURCE } from "../../constants";
import RestServiceResponse from "../../entity/RestServiceResponse";

export interface ConnectionConfig {
    baseUrl?: string;
    httpClient?: AxiosInstance;
}

export const DEFAULT_CONNECTION_CONFIG = {
    baseUrl: FLAT_FILE_DATA_SOURCE, // change to staging or production once integration with FES is smoothed over
    httpClient: axios.create(),
};

/**
 * Base class for services that interact with AICS APIs.
 */
export default class HttpServiceBase {
    public baseUrl = DEFAULT_CONNECTION_CONFIG.baseUrl;
    protected httpClient = DEFAULT_CONNECTION_CONFIG.httpClient;

    constructor(config: ConnectionConfig = {}) {
        if (config.baseUrl) {
            this.setBaseUrl(config.baseUrl);
        }

        if (config.httpClient) {
            this.setHttpClient(config.httpClient);
        }
    }

    public get<T>(url: string): Promise<RestServiceResponse<T>> {
        return this.httpClient.get(url).then((response) => new RestServiceResponse(response.data));
    }

    public setBaseUrl(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    public setHttpClient(client: AxiosInstance) {
        this.httpClient = client;
    }
}
