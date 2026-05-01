const TINYURL_API_URL = "https://api.tinyurl.com/create";

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
     * Returns the shortened URL.
     * @throws Error if the API call fails or the response is unexpected
     */
    public async shorten(url: string): Promise<string> {
        const response = await fetch(TINYURL_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url, domain: "tinyurl.com" }),
        });

        if (!response.ok) {
            throw new Error(`TinyURL API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data?.data?.tiny_url) {
            throw new Error("TinyURL API response missing tiny_url field");
        }

        return data.data.tiny_url;
    }
}
