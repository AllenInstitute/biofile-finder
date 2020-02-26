import axios, { AxiosInstance } from "axios";
import { Policy } from "cockatiel";
import * as LRUCache from "lru-cache";

import { DataSource } from "../../constants";
import RestServiceResponse from "../../entity/RestServiceResponse";

export interface ConnectionConfig {
    baseUrl?: string | keyof typeof DataSource;
    httpClient?: AxiosInstance;
}

export const DEFAULT_CONNECTION_CONFIG = {
    baseUrl: DataSource.STAGING,
    httpClient: axios.create(),
};

const MAX_CACHE_SIZE = 1000;

// retry policy: 5 times, with an exponential backoff between attempts
const retry = Policy.handleAll()
    .retry()
    .attempts(5)
    .exponential({
        maxAttempts: 5,
        maxDelay: 10 * 1000,
    });

/**
 * Base class for services that interact with AICS APIs.
 */
export default class HttpServiceBase {
    /**
     * Like Window::encodeURIComponent, but far less aggressive in its encoding.
     *
     * This should be removed once the File Explorer Service can
     * decode all reserved characters that Window::encodeURIComponent produces.
     */
    public static encodeURIComponent(str: string) {
        const CHARACTER_TO_ENCODING_MAP: { [index: string]: string } = {
            "+": "%2b",
            " ": "%20",
        };
        return str
            .split("")
            .map((chr) => {
                if (CHARACTER_TO_ENCODING_MAP.hasOwnProperty(chr)) {
                    return CHARACTER_TO_ENCODING_MAP[chr];
                }

                return chr;
            })
            .join("");
    }

    public baseUrl: string | keyof typeof DataSource = DEFAULT_CONNECTION_CONFIG.baseUrl;
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
            // if this fails, bubble up exception
            const response = await retry.execute(() => this.httpClient.get(url));

            if (response.status < 400 || response.data === undefined) {
                this.urlToResponseDataCache.set(url, response.data);
            } else {
                // by default axios will reject if does not satisfy: status >= 200 && status < 300
                throw new Error(`Request for ${url} failed`);
            }
        }

        const cachedResponseData = this.urlToResponseDataCache.get(url);

        if (!cachedResponseData) {
            throw new Error(`Unable to pull resource from cache: ${url}`);
        }

        return new RestServiceResponse(cachedResponseData);
    }

    public setBaseUrl(baseUrl: string | keyof typeof DataSource) {
        this.baseUrl = baseUrl;

        // bust cache when base url changes
        this.urlToResponseDataCache.reset();
    }

    public setHttpClient(client: AxiosInstance) {
        this.httpClient = client;
    }
}
