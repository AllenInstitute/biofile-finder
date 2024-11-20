import axios, { AxiosInstance } from "axios";
import { Policy } from "cockatiel";
import LRUCache from "lru-cache";

import { FESBaseUrlMap, LoadBalancerBaseUrlMap, MMSBaseUrlMap } from "../../constants";
import RestServiceResponse from "../../entity/RestServiceResponse";

export interface ConnectionConfig {
    applicationVersion?: string;
    fileExplorerServiceBaseUrl?: string | keyof typeof FESBaseUrlMap;
    httpClient?: AxiosInstance;
    loadBalancerBaseUrl?: string | keyof typeof LoadBalancerBaseUrlMap;
    metadataManagementServiceBaseURl?: string | keyof typeof MMSBaseUrlMap;
    pathSuffix?: string;
    userName?: string;
}

export const DEFAULT_CONNECTION_CONFIG = {
    fileExplorerServiceBaseUrl: FESBaseUrlMap.PRODUCTION,
    httpClient: axios.create(),
    loadBalancerBaseUrl: LoadBalancerBaseUrlMap.PRODUCTION,
    metadataManagementServiceBaseURl: MMSBaseUrlMap.PRODUCTION,
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
    "\t": "%09",
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
 * Base class for services that interact with APIs.
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
        // need to separate the query string components (which are split by ampersands themselves)
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

    public fileExplorerServiceBaseUrl: string =
        DEFAULT_CONNECTION_CONFIG.fileExplorerServiceBaseUrl;
    public loadBalancerBaseUrl: string = DEFAULT_CONNECTION_CONFIG.loadBalancerBaseUrl;
    public metadataManagementServiceBaseURl: string =
        DEFAULT_CONNECTION_CONFIG.metadataManagementServiceBaseURl;

    protected httpClient = DEFAULT_CONNECTION_CONFIG.httpClient;
    private applicationVersion = "NOT SET";
    private userName?: string;
    protected readonly pathSuffix: string = "";
    private readonly urlToResponseDataCache = new LRUCache<string, any>({ max: MAX_CACHE_SIZE });

    constructor(config: ConnectionConfig = {}) {
        if (config.applicationVersion) {
            this.setApplicationVersion(config.applicationVersion);
        }

        if (config.userName) {
            this.setUserName(config.userName);
        }

        if (config.fileExplorerServiceBaseUrl) {
            this.setFileExplorerServiceBaseUrl(config.fileExplorerServiceBaseUrl);
        }

        if (config.httpClient) {
            this.setHttpClient(config.httpClient);
        }

        if (config.loadBalancerBaseUrl) {
            this.setLoadBalancerBaseUrl(config.loadBalancerBaseUrl);
        }

        if (config.metadataManagementServiceBaseURl) {
            this.setLoadBalancerBaseUrl(config.metadataManagementServiceBaseURl);
        }

        if (config.pathSuffix) {
            this.pathSuffix = config.pathSuffix;
        }
    }

    public async get<T>(url: string): Promise<RestServiceResponse<T>> {
        const encodedUrl = HttpServiceBase.encodeURI(url);

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

    /**
     * Same as HttpServiceBase::get, but without an attempt at caching successful responses
     * or returning data from the cache.
     */
    public async getWithoutCaching<T>(url: string): Promise<RestServiceResponse<T>> {
        const encodedUrl = HttpServiceBase.encodeURI(url);

        const response = await retry.execute(() => this.httpClient.get(encodedUrl));
        return new RestServiceResponse(response.data);
    }

    public async rawPost<T>(url: string, body: string): Promise<T> {
        const encodedUrl = HttpServiceBase.encodeURI(url);
        const config = { headers: { "Content-Type": "application/json" } };

        let response;
        try {
            // if this fails, bubble up exception
            response = await retry.execute(() => this.httpClient.post(encodedUrl, body, config));
        } catch (err) {
            // Specific errors about the failure from services will be in this path
            if (axios.isAxiosError(err) && err?.response?.data?.message) {
                throw new Error(JSON.stringify(err.response.data.message));
            }
            throw err;
        }

        if (response.status >= 400 || response.data === undefined) {
            // by default axios will reject if does not satisfy: status >= 200 && status < 300
            throw new Error(`Request for ${encodedUrl} failed`);
        }

        return response.data;
    }

    public async rawPut<T>(
        url: string,
        body: string,
        headers: { [key: string]: string } = {}
    ): Promise<T> {
        const encodedUrl = HttpServiceBase.encodeURI(url);
        const config = { headers: { ...headers } };

        let response;
        try {
            // Retry policy wrapped around axios PUT
            response = await retry.execute(() => this.httpClient.put(encodedUrl, body, config));
        } catch (err) {
            if (axios.isAxiosError(err) && err?.response?.data?.message) {
                throw new Error(JSON.stringify(err.response.data.message));
            }
            throw err;
        }

        if (response.status >= 400 || response.data === undefined) {
            throw new Error(`Request for ${encodedUrl} failed`);
        }

        return response.data;
    }

    public async post<T>(url: string, body: string): Promise<RestServiceResponse<T>> {
        const encodedUrl = HttpServiceBase.encodeURI(url);
        const config = { headers: { "Content-Type": "application/json" } };

        let response;
        try {
            // if this fails, bubble up exception
            response = await retry.execute(() => this.httpClient.post(encodedUrl, body, config));
        } catch (err) {
            // Specific errors about the failure from services will be in this path
            if (axios.isAxiosError(err) && err?.response?.data?.message) {
                throw new Error(JSON.stringify(err.response.data.message));
            }
            throw err;
        }

        if (response.status >= 400 || response.data === undefined) {
            // by default axios will reject if does not satisfy: status >= 200 && status < 300
            throw new Error(`Request for ${encodedUrl} failed`);
        }

        return new RestServiceResponse(response.data);
    }

    public async patch<T>(url: string, body: string): Promise<RestServiceResponse<T>> {
        const encodedUrl = HttpServiceBase.encodeURI(url);
        const config = { headers: { "Content-Type": "application/json" } };

        let response;
        try {
            // if this fails, bubble up exception
            response = await retry.execute(() => this.httpClient.patch(encodedUrl, body, config));
        } catch (err) {
            // Specific errors about the failure from services will be in this path
            if (axios.isAxiosError(err) && err?.response?.data?.message) {
                throw new Error(JSON.stringify(err.response.data.message));
            }
            throw err;
        }

        if (response.status >= 400 || response.data === undefined) {
            // by default axios will reject if does not satisfy: status >= 200 && status < 300
            throw new Error(`Request for ${encodedUrl} failed`);
        }

        return new RestServiceResponse(response.data);
    }

    public setApplicationVersion(applicationVersion: string) {
        this.applicationVersion = applicationVersion;
        this.setHeaders();
    }

    public setFileExplorerServiceBaseUrl(
        fileExplorerServiceBaseUrl: string | keyof typeof FESBaseUrlMap
    ) {
        if (this.fileExplorerServiceBaseUrl !== fileExplorerServiceBaseUrl) {
            // bust cache when base url changes
            this.urlToResponseDataCache.reset();
        }

        this.fileExplorerServiceBaseUrl = fileExplorerServiceBaseUrl;
    }

    public setHttpClient(client: AxiosInstance) {
        if (this.httpClient !== client) {
            // bust cache when http client changes
            this.urlToResponseDataCache.reset();
        }

        this.httpClient = client;
        this.setHeaders();
    }

    private setHeaders() {
        this.httpClient.defaults.headers.common["X-Application-Version"] = this.applicationVersion;
        this.httpClient.defaults.headers.common["X-Client"] = "BioFile Finder";
        // Prevent assigning undefined X-User-Id which interferes with downstream requests
        if (this.userName) {
            this.httpClient.defaults.headers.common["X-User-Id"] = this.userName;
        } else {
            delete this.httpClient.defaults.headers.common["X-User-Id"];
        }
    }

    public setLoadBalancerBaseUrl(
        loadBalancerBaseUrl: string | keyof typeof LoadBalancerBaseUrlMap
    ) {
        if (this.loadBalancerBaseUrl !== loadBalancerBaseUrl) {
            // bust cache when base url changes
            this.urlToResponseDataCache.reset();
        }

        this.loadBalancerBaseUrl = loadBalancerBaseUrl;
    }

    public setMetadataManagementServiceBaseURl(
        metadataManagementServiceBaseURl: string | keyof typeof MMSBaseUrlMap
    ) {
        if (this.metadataManagementServiceBaseURl !== metadataManagementServiceBaseURl) {
            // bust cache when base url changes
            this.urlToResponseDataCache.reset();
        }

        this.metadataManagementServiceBaseURl = metadataManagementServiceBaseURl;
    }

    public setUserName(userName: string) {
        this.userName = userName;
        this.setHeaders();
    }
}
