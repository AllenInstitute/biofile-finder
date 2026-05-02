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

    constructor(token: string, domain = "tinyurl.com") {
        this.token = token;
        this.domain = domain;
    }

    /**
     * Shorten a URL using the TinyURL API.
     * @param url The long URL to shorten.
     * @param options Parameters including a custom alias and expiration time.
     * @returns The shortened URL.
     * @throws Error if the API call fails, the alias is already taken, or the response is unexpected.
     */
    public async shorten(url: string, options: ShortenOptions): Promise<string> {
        const expiresAt = new Date(Date.now() + options.expiresInMs).toISOString();
        const body: Record<string, string> = { url, domain: this.domain, expires_at: expiresAt };
        if (options.alias) {
            body.alias = options.alias;
        }

        const response = await fetch(`${TINYURL_API_URL}/create`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const apiErrors: string[] = errorData?.errors ?? [];
            if (apiErrors.some((e: string) => e.toLowerCase().includes("already taken"))) {
                throw new Error(
                    `The alias "${options.alias}" is already taken. Please choose a different alias.`
                );
            }
            throw new Error(`TinyURL API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data?.data?.tiny_url) {
            throw new Error("Unexpected response: Shortened URL missing");
        }

        return data.data.tiny_url;
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

        const response = await fetch(
            `${TINYURL_API_URL}/alias/${this.domain}/${encodeURIComponent(trimmed)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
            }
        );

        // A 200 response means the alias already exists
        // 422 can mean a lot of different things, but in practice I've only seen
        // it happen when the alias is taken yet & we don't have the permissions to
        // view details about it
        if (response.ok || response.status === 422) {
            throw new Error(
                `The alias "${trimmed}" is already taken. Please choose a different one.`
            );
        }

        // 404 means the alias is available — that's the success case
        if (response.status === 404) {
            return;
        }

        let errorMsg: string | undefined;
        try {
            const body = await response.json();
            errorMsg = body?.errors?.join(", ");
        } finally {
            throw new Error(`Failed to validate alias: ${errorMsg || response.statusText}`);
        }
    }
}
