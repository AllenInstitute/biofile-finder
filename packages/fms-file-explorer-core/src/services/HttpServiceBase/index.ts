import axios, { AxiosInstance } from "axios";
import * as LRUCache from "lru-cache";

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

const MAX_CACHE_SIZE = 1000;

/**
 * Base class for services that interact with AICS APIs.
 */
export default class HttpServiceBase {
    public baseUrl = DEFAULT_CONNECTION_CONFIG.baseUrl;
    protected httpClient = DEFAULT_CONNECTION_CONFIG.httpClient;

    private urlToResponseDataCache = new LRUCache<string, any>({ max: MAX_CACHE_SIZE });

    constructor(config: ConnectionConfig = {}) {
        if (config.baseUrl) {
            this.setBaseUrl(config.baseUrl);
        }

        if (config.httpClient) {
            this.setHttpClient(config.httpClient);
        }
    }

    public async get<T>(url: string): Promise<RestServiceResponse<T>> {
        if (!this.urlToResponseDataCache.has(url)) {
            try {
                const response = await this.httpClient.get(url);
                if (response.status < 400) {
                    this.urlToResponseDataCache.set(url, response.data);
                }
            } catch (e) {
                // TODO
                console.error(`Unable to fetch resource: ${url}`, e);
            }
        }

        const cachedResponseData = this.urlToResponseDataCache.get(url);

        if (!cachedResponseData) {
            throw new Error(`Unable to pull resource from cache: ${url}`);
        }

        return new RestServiceResponse(cachedResponseData);
    }

    public setBaseUrl(baseUrl: string) {
        this.baseUrl = baseUrl;

        // bust cache when base url changes
        this.urlToResponseDataCache.reset();
    }

    public setHttpClient(client: AxiosInstance) {
        this.httpClient = client;
    }
}
