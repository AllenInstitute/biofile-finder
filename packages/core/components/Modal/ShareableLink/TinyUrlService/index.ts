import { AxiosInstance } from "axios";

const TINYURL_API_URL = "https://api.tinyurl.com";

/** Regex matching what TinyURL considers a valid alias: alphanumeric and hyphens */
const VALID_ALIAS_PATTERN = /^[a-zA-Z0-9-]+$/;

export interface ShortenOptions {
    /** Optional custom alias for the short URL (e.g. "my-dataset-query") */
    alias?: string;
    /** How long the shortened link should live, in milliseconds. */
    expiresInMs: number;
}

/**
 * Service for shortening URLs using the TinyURL API.
 * Requires an API token (see https://tinyurl.com/app/dev).
 */
export default class TinyUrlService {
    private readonly token: string;
    private readonly domain: string;
    private readonly httpClient: AxiosInstance;

    constructor(token: string, domain = "tinyurl.com", httpClient: AxiosInstance) {
        this.token = token;
        this.domain = domain;
        this.httpClient = httpClient;
    }

    /**
     * Shorten a URL using the TinyURL API.
     * @param url The long URL to shorten.
     * @param options Parameters including a custom alias and expiration time.
     * @returns The shortened URL.
     * @throws Error if the API call fails, the alias is already taken, or the response is unexpected.
     */
    public async shorten(url: string, options: ShortenOptions): Promise<string> {
        const expiresAtDate = new Date(Date.now() + options.expiresInMs);
        const expiresAt = expiresAtDate.toISOString();
        const body: Record<string, string> = { url, domain: this.domain, expires_at: expiresAt };
        if (options.alias) {
            body.alias = options.alias;
        }

        const response = await this.httpClient.post(`${TINYURL_API_URL}/create`, body, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
        });

        if (response.status >= 400) {
            const apiErrors: string[] = response.data?.errors ?? [];
            if (apiErrors.some((e: string) => e.toLowerCase().includes("already taken"))) {
                throw new Error(
                    `The alias "${options.alias}" is already taken. Please choose a different alias.`
                );
            }
            throw new Error(`TinyURL API returned ${response.status}: ${response.statusText}`);
        }

        if (!response.data?.data?.tiny_url) {
            throw new Error("Unexpected response: Shortened URL missing");
        }

        // Verify the API honored the requested expiration
        const returnedExpiry = response.data.data.expires_at;
        const returnedMs = new Date(returnedExpiry).getTime();
        const expectedMs = new Date(expiresAt).getTime();

        // Allow up to 24 hours of drift between what we sent and what the API returned
        const msInDay = 24 * 60 * 60 * 1000; // 86400000
        if (Math.abs(returnedMs - expectedMs) > msInDay) {
            console.warn(
                `TinyURL expiration mismatch: requested ${expiresAt}, got ${returnedExpiry}`
            );
            throw new Error(
                `This URL has already been shortened with an expiration time of ${new Date(
                    returnedExpiry
                ).toDateString()}. Shortened URLs cannot have multiple expiration times. To use ${expiresAtDate.toDateString()}, please create a new alias.`
            );
        }

        return response.data.data.tiny_url;
    }

    /**
     * Validate whether a custom alias is available and well-formed.
     * Uses the TinyURL GET /alias/{domain}/{alias} endpoint.
     * @param alias The alias to validate.
     * @throws Error if the alias is empty, contains invalid characters, or is already taken.
     */
    public async validateAlias(alias: string): Promise<void> {
        const trimmed = alias.trim();
        if (!trimmed) {
            return; // Empty alias is fine — one will be generated
        }
        if (!VALID_ALIAS_PATTERN.test(trimmed)) {
            throw new Error("Alias can only contain letters, numbers, and hyphens.");
        }

        const response = await this.httpClient.get(
            `${TINYURL_API_URL}/alias/${this.domain}/${encodeURIComponent(trimmed)}`,
            {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
            }
        );

        // A 200 response means the alias already exists
        // 422 can mean a lot of different things, but in practice I've only seen
        // it happen when the alias is taken yet & we don't have the permissions to
        // view details about it
        if (response.status === 200 || response.status === 422) {
            throw new Error(
                `The alias "${trimmed}" is already taken. Please choose a different one.`
            );
        }

        // 404 means the alias is available — that's the success case
        if (response.status === 404) {
            return;
        }

        const errorMsg = response.data?.errors?.join(", ");
        throw new Error(`Failed to validate alias: ${errorMsg || response.statusText}`);
    }
}
