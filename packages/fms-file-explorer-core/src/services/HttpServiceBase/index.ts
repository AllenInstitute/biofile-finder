import axios, { AxiosInstance } from "axios";

export interface ConnectionConfig {
    baseUrl?: string;
    httpClient?: AxiosInstance;
}

export const DEFAULT_CONNECTION_CONFIG = {
    baseUrl: "http://aics.corp.alleninstitute.org",
    httpClient: axios.create(),
};

/**
 * Base class for services that interact with AICS APIs.
 */
export default class HttpServiceBase {
    protected baseUrl = DEFAULT_CONNECTION_CONFIG.baseUrl;
    protected httpClient = DEFAULT_CONNECTION_CONFIG.httpClient;

    constructor(config: ConnectionConfig = {}) {
        if (config.baseUrl) {
            this.setBaseUrl(config.baseUrl);
        }

        if (config.httpClient) {
            this.setHttpClient(config.httpClient);
        }
    }

    public setBaseUrl(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    public setHttpClient(client: AxiosInstance) {
        this.httpClient = client;
    }
}
