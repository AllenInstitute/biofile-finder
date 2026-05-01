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
            const longUrl = "https://bff.allencell.org/app?someVeryLongQueryString=true";
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

        it("includes expires_at set to one week from now in the request body", async () => {
            // Arrange
            const longUrl = "https://bff.allencell.org/app?query=test";
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

            const beforeCall = Date.now();
            const service = new TinyUrlService("my-token");
            await service.shorten(longUrl);
            const afterCall = Date.now();

            // Assert
            const [, calledOptions] = fetchStub.args[0];
            const body = JSON.parse((calledOptions as RequestInit).body as string);
            expect(body.url).to.equal(longUrl);
            expect(body.domain).to.equal("tinyurl.com");

            const expiresAt = new Date(body.expires_at).getTime();
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            expect(expiresAt).to.be.at.least(beforeCall + oneWeekMs);
            expect(expiresAt).to.be.at.most(afterCall + oneWeekMs);
        });

        it("includes a custom alias in the request body when provided", async () => {
            // Arrange
            const longUrl = "https://bff.allencell.org/app?query=test";
            const alias = "my-custom-alias";
            const fetchStub = sandbox.stub(globalThis, "fetch").resolves(
                new Response(
                    JSON.stringify({
                        data: { tiny_url: `https://tinyurl.com/${alias}` },
                        code: 0,
                        errors: [],
                    }),
                    { status: 200 }
                )
            );

            const service = new TinyUrlService("my-token");

            // Act
            await service.shorten(longUrl, { alias });

            // Assert
            const [, calledOptions] = fetchStub.args[0];
            const body = JSON.parse((calledOptions as RequestInit).body as string);
            expect(body.alias).to.equal(alias);
        });

        it("does not include alias in the request body when not provided", async () => {
            // Arrange
            const fetchStub = sandbox.stub(globalThis, "fetch").resolves(
                new Response(
                    JSON.stringify({
                        data: { tiny_url: "https://tinyurl.com/noalias" },
                        code: 0,
                        errors: [],
                    }),
                    { status: 200 }
                )
            );

            const service = new TinyUrlService("my-token");
            await service.shorten("https://bff.allencell.org/app?q=1");

            // Assert
            const [, calledOptions] = fetchStub.args[0];
            const body = JSON.parse((calledOptions as RequestInit).body as string);
            expect(body).not.to.have.property("alias");
        });

        it("throws a descriptive error when the alias is already taken", async () => {
            // Arrange
            sandbox.stub(globalThis, "fetch").resolves(
                new Response(
                    JSON.stringify({ code: 422, errors: ["already taken"] }),
                    { status: 422, statusText: "Unprocessable Entity" }
                )
            );

            const service = new TinyUrlService("test-token");

            // Act & Assert
            try {
                await service.shorten("https://bff.allencell.org/app", { alias: "taken-alias" });
                expect.fail("Expected an error to be thrown");
            } catch (err) {
                expect((err as Error).message).to.include("taken-alias");
                expect((err as Error).message).to.include("already taken");
            }
        });

        it("throws an error when the API returns a non-OK status", async () => {
            // Arrange
            sandbox.stub(globalThis, "fetch").resolves(
                new Response(
                    JSON.stringify({ code: 401, errors: [] }),
                    { status: 401, statusText: "Unauthorized" }
                )
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
    });
});
