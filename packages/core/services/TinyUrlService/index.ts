const TINYURL_API_URL = "https://api.tinyurl.com/create";

/** One week expressed in milliseconds */
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface ShortenOptions {
    /** Optional custom alias for the short URL (e.g. "my-dataset-query") */
    alias?: string;
}

/**
 * Service for shortening URLs using the TinyURL API.
 * Requires an API token (see https://tinyurl.com/app/dev).
 */
export default class TinyUrlService {
    private readonly token: string;

    constructor(token: string) {
        this.token = token;
    }

    /**
     * Shorten a URL using the TinyURL API.
     * Shortened URLs expire after 1 week by default.
     * @param url The long URL to shorten.
     * @param options Optional parameters, including a custom alias.
     * @returns The shortened URL.
     * @throws Error if the API call fails, the alias is already taken, or the response is unexpected.
     */
    public async shorten(url: string, options: ShortenOptions = {}): Promise<string> {
        const expiresAt = new Date(Date.now() + ONE_WEEK_MS).toISOString();
        const body: Record<string, string> = { url, domain: "tinyurl.com", expires_at: expiresAt };
        if (options.alias) {
            body.alias = options.alias;
        }

        const response = await fetch(TINYURL_API_URL, {
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
                throw new Error(`The alias "${options.alias}" is already taken. Please choose a different alias.`);
            }
            throw new Error(`TinyURL API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data?.data?.tiny_url) {
            throw new Error("TinyURL API response missing tiny_url field");
        }

        return data.data.tiny_url;
    }
}
