import axios, { AxiosInstance } from "axios";

export interface ConnectionConfig {
    host?: string;
    httpClient?: AxiosInstance;
    port?: number;
    protocol?: string;
}

export const DEFAULT_CONNECTION_CONFIG = {
    host: "aics.corp.alleninstitute.org",
    httpClient: axios.create(),
    port: 80,
    protocol: "http",
};

/**
 * Base class for services that interact with AICS APIs.
 */
export default class HttpServiceBase {
    protected host = DEFAULT_CONNECTION_CONFIG.host;
    protected httpClient = DEFAULT_CONNECTION_CONFIG.httpClient;
    protected port = DEFAULT_CONNECTION_CONFIG.port;
    protected protocol = DEFAULT_CONNECTION_CONFIG.protocol;

    constructor(config: ConnectionConfig = {}) {
        if (config.host) {
            this.setHost(config.host);
        }

        if (config.httpClient) {
            this.setHttpClient(config.httpClient);
        }

        if (config.port) {
            this.setPort(config.port);
        }

        if (config.protocol) {
            this.setProtocol(config.protocol);
        }
    }

    public setHost(host: string) {
        this.host = host;
    }

    public setHttpClient(client: AxiosInstance) {
        this.httpClient = client;
    }

    public setProtocol(protocol: string) {
        this.protocol = protocol;
    }

    public setPort(port: number) {
        this.port = port;
    }
}
