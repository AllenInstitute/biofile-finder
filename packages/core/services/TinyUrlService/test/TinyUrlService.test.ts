import { expect } from "chai";
import { createSandbox } from "sinon";

import TinyUrlService from "..";

describe("TinyUrlService", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("shorten", () => {
        it("returns the shortened URL from TinyURL API response", async () => {
            // Arrange
            const token = "test-token";
            const longUrl = "https://biofile-finder.allencell.org/app?someVeryLongQueryString=true";
            const shortUrl = "https://tinyurl.com/abc123";

            const fetchStub = sandbox.stub(globalThis, "fetch").resolves(
                new Response(
                    JSON.stringify({
                        data: { tiny_url: shortUrl, url: longUrl },
                        code: 0,
                        errors: [],
                    }),
                    { status: 200 }
                )
            );

            const service = new TinyUrlService(token);

            // Act
            const result = await service.shorten(longUrl);

            // Assert
            expect(result).to.equal(shortUrl);
            expect(fetchStub.calledOnce).to.be.true;
            const [calledUrl, calledOptions] = fetchStub.args[0];
            expect(calledUrl).to.equal("https://api.tinyurl.com/create");
            expect(calledOptions).to.deep.include({
                method: "POST",
            });
            expect((calledOptions as RequestInit).headers).to.deep.include({
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            });
        });

        it("throws an error when the API returns a non-OK status", async () => {
            // Arrange
            sandbox.stub(globalThis, "fetch").resolves(
                new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
            );

            const service = new TinyUrlService("invalid-token");

            // Act & Assert
            try {
                await service.shorten("https://example.com");
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("401");
            }
        });

        it("throws an error when the API response is missing the tiny_url field", async () => {
            // Arrange
            sandbox.stub(globalThis, "fetch").resolves(
                new Response(JSON.stringify({ data: {}, code: 1, errors: ["some error"] }), {
                    status: 200,
                })
            );

            const service = new TinyUrlService("test-token");

            // Act & Assert
            try {
                await service.shorten("https://example.com");
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("tiny_url");
            }
        });

        it("sends the correct request body", async () => {
            // Arrange
            const longUrl = "https://biofile-finder.allencell.org/app?query=test";
            const fetchStub = sandbox.stub(globalThis, "fetch").resolves(
                new Response(
                    JSON.stringify({
                        data: { tiny_url: "https://tinyurl.com/xyz789" },
                        code: 0,
                        errors: [],
                    }),
                    { status: 200 }
                )
            );

            const service = new TinyUrlService("my-token");

            // Act
            await service.shorten(longUrl);

            // Assert
            const [, calledOptions] = fetchStub.args[0];
            const body = JSON.parse((calledOptions as RequestInit).body as string);
            expect(body).to.deep.equal({ url: longUrl, domain: "tinyurl.com" });
        });
    });
});
