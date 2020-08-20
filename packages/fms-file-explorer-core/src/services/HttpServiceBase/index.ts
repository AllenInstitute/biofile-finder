import axios, { AxiosInstance } from "axios";
import { Policy } from "cockatiel";
import LRUCache from "lru-cache";

import { DataSource } from "../../constants";
import RestServiceResponse from "../../entity/RestServiceResponse";

export interface ConnectionConfig {
    baseUrl?: string | keyof typeof DataSource;
    httpClient?: AxiosInstance;
}

export const DEFAULT_CONNECTION_CONFIG = {
    baseUrl: DataSource.PRODUCTION,
    httpClient: axios.create(),
};

const CHARACTER_TO_ENCODING_MAP: { [index: string]: string } = {
    "+": "%2b",
    " ": "%20",
    "&": "%26",
    "%": "%25",
    "?": "%3F",
    "[": "%5B",
    "]": "%5D",
    "#": "%23",
    "\\": "%5C",
    "\n": "%0A",
    "\r": "%0D",
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
     * Like Window::encodeURI, but tuned to the needs of this application.
     * The wild-west nature of our annotation names ("cTnT%", "R&DWorkflow", "Craters?") necessitates this custom code.
     */
    public static encodeURI(uri: string) {
        const queryStringStart = uri.indexOf("?");
        let path = uri;
        let queryString = "";
        if (queryStringStart !== -1) {
            path = uri.substring(0, queryStringStart);
            queryString = uri.substring(queryStringStart + 1);
        }

        if (!queryString) {
            return uri;
        }

        // encode ampersands that do not separate query string components, so first
        // need to separate the query string componenets (which are split by ampersands themselves)
        // handles case like `workflow=R&DExp&cell_line=AICS-46&foo=bar&cTnT%=3.0`
        const re = /&(?=(?:[^&])+\=)/g;
        const queryStringComponents = queryString.split(re);

        const encodedQueryString = queryStringComponents
            .map((keyValuePair) => this.encodeURISection(keyValuePair))
            .join("&");

        if (encodedQueryString) {
            return `${path}?${encodedQueryString}`;
        }

        return path;
    }

    /**
     * Encodes special characters in given string to be URI friendly
     */
    protected static encodeURISection(section: string) {
        return [...section] // Split string into characters (https://stackoverflow.com/questions/4547609/how-do-you-get-a-string-to-a-character-array-in-javascript/34717402#34717402)
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
        const encodedUrl = HttpServiceBase.encodeURI(url);
        console.log(`Sanitized ${url} to ${encodedUrl}`);

        if (!this.urlToResponseDataCache.has(encodedUrl)) {
            // if this fails, bubble up exception
            const response = await retry.execute(() => this.httpClient.get(encodedUrl));

            if (response.status < 400 && response.data !== undefined) {
                this.urlToResponseDataCache.set(encodedUrl, response.data);
            } else {
                // by default axios will reject if does not satisfy: status >= 200 && status < 300
                throw new Error(`Request for ${encodedUrl} failed`);
            }
        }

        const cachedResponseData = this.urlToResponseDataCache.get(encodedUrl);

        if (!cachedResponseData) {
            throw new Error(`Unable to pull resource from cache: ${encodedUrl}`);
        }

        return new RestServiceResponse(cachedResponseData);
    }

    public setBaseUrl(baseUrl: string | keyof typeof DataSource) {
        if (this.baseUrl !== baseUrl) {
            // bust cache when base url changes
            this.urlToResponseDataCache.reset();
        }

        this.baseUrl = baseUrl;
    }

    public setHttpClient(client: AxiosInstance) {
        if (this.httpClient !== client) {
            // bust cache when http client changes
            this.urlToResponseDataCache.reset();
        }

        this.httpClient = client;
    }
}
