import { createMockHttpClient } from "@aics/redux-utils";
import { AxiosRequestConfig } from "axios";
import { expect } from "chai";

import TinyUrlService from "..";

/**
 * Like createMockHttpClient but rejects on non-2xx status codes, matching real
 * Axios behavior.
 */
function createMockHttpClientWithErrors(...args: Parameters<typeof createMockHttpClient>) {
    const client = createMockHttpClient(...args);
    client.interceptors.response.use((response) => {
        if (response.status && (response.status < 200 || response.status >= 300)) {
            const error: any = new Error(`Request failed with status code ${response.status}`);
            error.response = response;
            return Promise.reject(error);
        }
        return response;
    });
    return client;
}

describe("TinyUrlService", () => {
    describe("shorten", () => {
        it("returns the shortened URL from TinyURL API response", async () => {
            // Arrange
            const domain = "test";
            const token = "test-token";
            const longUrl = "https://bff.allencell.org/app?someVeryLongQueryString=true";
            const shortUrl = `https://${domain}/abc123`;

            const httpClient = createMockHttpClient({
                when: "https://api.tinyurl.com/create",
                respondWith: {
                    data: {
                        data: { tiny_url: shortUrl, url: longUrl },
                        code: 0,
                        errors: [],
                    },
                },
            });

            const service = new TinyUrlService(token, domain, httpClient);

            // Act
            const result = await service.shorten(longUrl, { expiresInMs: 7 });

            // Assert
            expect(result).to.equal(shortUrl);
        });

        it("includes expires_at set to one week from now in the request body", async () => {
            // Arrange
            const longUrl = "https://bff.allencell.org/app?query=test";
            let capturedData: Record<string, string> | undefined;

            const httpClient = createMockHttpClient({
                when: (config: AxiosRequestConfig) => {
                    if (config.url === "https://api.tinyurl.com/create") {
                        capturedData = JSON.parse(config.data);
                        return true;
                    }
                    return false;
                },
                respondWith: {
                    data: {
                        data: { tiny_url: "https://tinyurl.com/xyz789" },
                        code: 0,
                        errors: [],
                    },
                },
            });

            const beforeCall = Date.now();
            const service = new TinyUrlService("my-token", "tinyurl.com", httpClient);
            await service.shorten(longUrl, { expiresInMs: 7 * 24 * 60 * 60 * 1000 });
            const afterCall = Date.now();

            // Assert
            expect(capturedData).to.exist;
            expect(capturedData?.url).to.equal(longUrl);
            expect(capturedData?.domain).to.equal("tinyurl.com");

            const expiresAt = capturedData ? new Date(capturedData.expires_at).getTime() : 0;
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            expect(expiresAt).to.be.at.least(beforeCall + oneWeekMs);
            expect(expiresAt).to.be.at.most(afterCall + oneWeekMs);
        });

        it("includes a custom alias in the request body when provided", async () => {
            // Arrange
            const longUrl = "https://bff.allencell.org/app?query=test";
            const alias = "my-custom-alias";
            let capturedData: Record<string, string> | undefined;

            const httpClient = createMockHttpClient({
                when: (config: AxiosRequestConfig) => {
                    if (config.url === "https://api.tinyurl.com/create") {
                        capturedData = JSON.parse(config.data);
                        return true;
                    }
                    return false;
                },
                respondWith: {
                    data: {
                        data: { tiny_url: `https://tinyurl.com/${alias}` },
                        code: 0,
                        errors: [],
                    },
                },
            });

            const service = new TinyUrlService("my-token", "tinyurl.com", httpClient);

            // Act
            await service.shorten(longUrl, { alias, expiresInMs: 1231 });

            // Assert
            expect(capturedData).to.exist;
            expect(capturedData?.alias).to.equal(alias);
        });

        it("does not include alias in the request body when not provided", async () => {
            // Arrange
            let capturedData: Record<string, string> | undefined;

            const httpClient = createMockHttpClient({
                when: (config: AxiosRequestConfig) => {
                    if (config.url === "https://api.tinyurl.com/create") {
                        capturedData = JSON.parse(config.data);
                        return true;
                    }
                    return false;
                },
                respondWith: {
                    data: {
                        data: { tiny_url: "https://tinyurl.com/noalias" },
                        code: 0,
                        errors: [],
                    },
                },
            });

            const service = new TinyUrlService("my-token", "tinyurl.com", httpClient);
            await service.shorten("https://bff.allencell.org/app?q=1", { expiresInMs: 1231 });

            // Assert
            expect(capturedData).to.exist;
            expect(capturedData).not.to.have.property("alias");
        });

        it("throws a descriptive error when the alias is already taken", async () => {
            // Arrange
            const httpClient = createMockHttpClientWithErrors({
                when: "https://api.tinyurl.com/create",
                respondWith: {
                    status: 422,
                    statusText: "Unprocessable Entity",
                    data: { code: 422, errors: ["already taken"] },
                },
            });

            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);

            // Act & Assert
            try {
                await service.shorten("https://bff.allencell.org/app", {
                    alias: "taken-alias",
                    expiresInMs: 7 * 24 * 60 * 60 * 1000,
                });
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("422");
                expect((err as any).response.data.errors).to.include("already taken");
            }
        });

        it("throws an error when the API returns a non-OK status", async () => {
            // Arrange
            const httpClient = createMockHttpClientWithErrors({
                when: "https://api.tinyurl.com/create",
                respondWith: {
                    status: 401,
                    statusText: "Unauthorized",
                    data: { code: 401, errors: [] },
                },
            });

            const service = new TinyUrlService("invalid-token", "tinyurl.com", httpClient);

            // Act & Assert
            try {
                await service.shorten("https://example.com", {
                    expiresInMs: 7 * 24 * 60 * 60 * 1000,
                });
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("401");
            }
        });

        it("throws an error when the API response is missing the tiny_url field", async () => {
            // Arrange
            const httpClient = createMockHttpClient({
                when: "https://api.tinyurl.com/create",
                respondWith: {
                    data: { data: {}, code: 1, errors: ["some error"] },
                },
            });

            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);

            // Act & Assert
            try {
                await service.shorten("https://example.com", {
                    expiresInMs: 7 * 24 * 60 * 60 * 1000,
                });
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("Shortened URL missing");
            }
        });

        it("uses the custom domain in the request body", async () => {
            // Arrange
            const customDomain = "custom.short.link";
            let capturedData: Record<string, string> | undefined;

            const httpClient = createMockHttpClient({
                when: (config: AxiosRequestConfig) => {
                    if (config.url === "https://api.tinyurl.com/create") {
                        capturedData = JSON.parse(config.data);
                        return true;
                    }
                    return false;
                },
                respondWith: {
                    data: {
                        data: { tiny_url: `https://${customDomain}/abc` },
                        code: 0,
                        errors: [],
                    },
                },
            });

            const service = new TinyUrlService("test-token", customDomain, httpClient);

            // Act
            await service.shorten("https://example.com", { expiresInMs: 1000 });

            // Assert
            expect(capturedData).to.exist;
            expect(capturedData?.domain).to.equal(customDomain);
        });
    });

    describe("validateAlias", () => {
        it("resolves without error when the alias is available (404)", async () => {
            // Arrange
            const httpClient = createMockHttpClientWithErrors({
                when: "https://api.tinyurl.com/alias/tinyurl.com/available-alias",
                respondWith: { status: 404, statusText: "Not Found" },
            });

            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);

            // Act & Assert — should not throw
            await service.validateAlias("available-alias");
        });

        it("throws when the alias is already taken (200)", async () => {
            // Arrange
            const httpClient = createMockHttpClient({
                when: "https://api.tinyurl.com/alias/tinyurl.com/taken-alias",
                respondWith: { status: 200, data: {} },
            });

            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);

            // Act & Assert
            try {
                await service.validateAlias("taken-alias");
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("already taken");
                expect((err as Error).message).to.include("taken-alias");
            }
        });

        it("throws when the alias contains invalid characters", async () => {
            const httpClient = createMockHttpClient();
            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);

            try {
                await service.validateAlias("bad alias!");
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("letters, numbers, and hyphens");
            }
        });

        it("resolves without error for an empty alias", async () => {
            const httpClient = createMockHttpClient();
            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);
            // Should not throw — empty means auto-generate
            await service.validateAlias("");
            await service.validateAlias("   ");
        });

        it("throws a generic error for unexpected HTTP status codes", async () => {
            const httpClient = createMockHttpClientWithErrors({
                when: "https://api.tinyurl.com/alias/tinyurl.com/some-alias",
                respondWith: { status: 500, statusText: "Internal Server Error" },
            });

            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);

            try {
                await service.validateAlias("some-alias");
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("Internal Server Error");
            }
        });

        it("calls the correct TinyURL alias check endpoint", async () => {
            let capturedUrl: string | undefined;

            const httpClient = createMockHttpClientWithErrors({
                when: (config: AxiosRequestConfig) => {
                    capturedUrl = config.url;
                    return true;
                },
                respondWith: { status: 404 },
            });

            const service = new TinyUrlService("test-token", "tinyurl.com", httpClient);
            await service.validateAlias("my-alias");

            expect(capturedUrl).to.equal("https://api.tinyurl.com/alias/tinyurl.com/my-alias");
        });

        it("uses the custom domain in the alias check URL", async () => {
            // Arrange
            const customDomain = "custom.short.link";
            const customAlias = "alias123";
            let capturedUrl: string | undefined;

            const httpClient = createMockHttpClientWithErrors({
                when: (config: AxiosRequestConfig) => {
                    capturedUrl = config.url;
                    return true;
                },
                respondWith: { status: 404 },
            });

            const service = new TinyUrlService("test-token", customDomain, httpClient);

            // Act
            await service.validateAlias(customAlias);

            // Assert
            expect(capturedUrl).to.equal(
                `https://api.tinyurl.com/alias/${customDomain}/${customAlias}`
            );
        });
    });
});
