import { expect } from "chai";

import Zarr from "..";

describe("Zarr", () => {
    type MockFetchResponse = {
        ok: boolean;
        json?: Record<string, any>;
    };

    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    async function collect(generator: AsyncGenerator<string>): Promise<string[]> {
        const items: string[] = [];
        for await (const item of generator) {
            items.push(item);
        }
        return items;
    }

    describe("getRelativeFilePaths", () => {
        it("enumerates v3 metadata and chunk files", async () => {
            const basePath = "https://example.org/sample.zarr";
            const responses: Record<string, MockFetchResponse> = {
                [`${basePath}//zarr.json`]: {
                    ok: true,
                    json: {
                        multiscales: [{ datasets: [{ path: "0" }] }],
                    },
                },
                [`${basePath}/labels/zarr.json`]: {
                    ok: true,
                    json: {
                        attributes: {
                            ome: {
                                labels: ["nuclei"],
                            },
                        },
                    },
                },
                [`${basePath}/labels/nuclei/zarr.json`]: {
                    ok: true,
                    json: {
                        shape: [1],
                        chunk_grid: {
                            configuration: {
                                chunk_shape: [1],
                            },
                        },
                    },
                },
                [`${basePath}/0/zarr.json`]: {
                    ok: true,
                    json: {
                        shape: [2, 3],
                        chunk_grid: {
                            configuration: {
                                chunk_shape: [1, 2],
                            },
                        },
                        chunk_key_encoding: {
                            name: "default",
                            configuration: {
                                separator: "/",
                            },
                        },
                    },
                },
            };

            globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
                if (init?.method === "HEAD") {
                    return { ok: false } as Response;
                }

                const key = String(input);
                const response = responses[key];
                if (!response) {
                    return { ok: false } as Response;
                }

                return {
                    ok: response.ok,
                    json: async () => response.json,
                } as Response;
            }) as typeof globalThis.fetch;

            const zarr = new Zarr(basePath);
            const files = await collect(zarr.getRelativeFilePaths());

            expect(files).to.deep.equal([
                "/zarr.json",
                "labels/nuclei/zarr.json",
                "labels/nuclei/c/0",
                "0/zarr.json",
                "0/c/0/0",
                "0/c/0/1",
                "0/c/1/0",
                "0/c/1/1",
            ]);
        });

        it("throws if root metadata cannot be found", async () => {
            const basePath = "https://example.org/missing.zarr";

            globalThis.fetch = (async () => {
                return { ok: false } as Response;
            }) as typeof globalThis.fetch;

            const zarr = new Zarr(basePath);

            try {
                await collect(zarr.getRelativeFilePaths());
                throw new Error("Expected getRelativeFilePaths to throw");
            } catch (error) {
                expect((error as Error).message).to.equal(
                    `Expected to find a metadata file for the Zarr at ${basePath}//zarr.json`
                );
            }
        });

        it("uses custom chunk separator when provided in v3 metadata", async () => {
            const basePath = "https://example.org/separator.zarr";
            const responses: Record<string, MockFetchResponse> = {
                [`${basePath}//zarr.json`]: {
                    ok: true,
                    json: {
                        multiscales: [{ datasets: [{ path: "0" }] }],
                    },
                },
                [`${basePath}/0/zarr.json`]: {
                    ok: true,
                    json: {
                        shape: [2, 2],
                        chunk_grid: {
                            configuration: {
                                chunk_shape: [1, 1],
                            },
                        },
                        chunk_key_encoding: {
                            name: "default",
                            configuration: {
                                separator: ".",
                            },
                        },
                    },
                },
            };

            globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
                if (init?.method === "HEAD") {
                    return { ok: false } as Response;
                }

                const key = String(input);
                const response = responses[key];
                if (!response) {
                    return { ok: false } as Response;
                }

                return {
                    ok: response.ok,
                    json: async () => response.json,
                } as Response;
            }) as typeof globalThis.fetch;

            const zarr = new Zarr(basePath);
            const files = await collect(zarr.getRelativeFilePaths());

            expect(files).to.deep.equal([
                "/zarr.json",
                "0/zarr.json",
                "0.c.0.0",
                "0.c.0.1",
                "0.c.1.0",
                "0.c.1.1",
            ]);
        });
    });
});
