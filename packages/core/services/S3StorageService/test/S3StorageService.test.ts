import { expect } from "chai";

import S3StorageService from "..";

describe("S3StorageService", () => {
    // This uses an external package, so is mostly just a consistency check
    describe("formatAsHttpResource", () => {
        const s3StorageService = new S3StorageService();
        ((s3StorageService as unknown) as {
            httpClient: { head: (url: string) => Promise<{ status: number }> };
        }).httpClient = {
            head: async () => ({ status: 200 }),
        };

        const testUrls = [
            {
                // Path style
                url: "https://s3.region.amazonaws.com/some-bucket.org/testfile",
                expected: "https://s3.region.amazonaws.com/some-bucket.org/testfile",
            },
            {
                // Path style
                url: "https://s3.region.amazonaws.com/some-bucket/key/with/multiple/parts",
                expected: "https://some-bucket.s3.region.amazonaws.com/key/with/multiple/parts",
            },
            {
                // Virtually-hosted style
                url: "https://some-bucket.s3-aws-region.amazonaws.com/testfile",
                expected: "https://some-bucket.s3-aws-region.amazonaws.com/testfile",
            },
            {
                // S3 protocol
                url: "s3://some-bucket/path/to/testfile",
                expected: "https://some-bucket.s3.amazonaws.com/path/to/testfile",
            },
            {
                url: "https://s3.region.amazonaws.com/some-bucket/path with spaces/a#b?c.txt",
                expected:
                    "https://some-bucket.s3.region.amazonaws.com/path%20with%20spaces/a%23b%3Fc.txt",
            },
        ];

        testUrls.forEach(({ url, expected }, idx) => {
            it(`(${idx}) parses standard s3 url correctly`, async () => {
                // Act
                const reformattedUrl = await s3StorageService.formatAsHttpResource(url);

                // Assert
                expect(reformattedUrl).to.equal(expected);
            });
        });

        it("parses virtualized s3 url", async () => {
            // Act
            const reformattedUrl = await s3StorageService.formatAsHttpResource(
                "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/10005.zarr"
            );

            // Assert
            expect(reformattedUrl).to.equal(
                "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/10005.zarr"
            );
        });

        it("does not re-encode a key that already arrived encoded", async () => {
            const reformattedUrl = await s3StorageService.formatAsHttpResource(
                "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/Dataset%20Manifest.csv"
            );

            expect(reformattedUrl).to.equal(
                "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/Dataset%20Manifest.csv"
            );
        });

        it("encodes within segments only, leaving the key's path structure intact", async () => {
            const encode = (key: string) =>
                s3StorageService.formatAsHttpResource({
                    hostname: "s3.amazonaws.com",
                    bucket: "some-bucket",
                    key,
                });
            const path = "https://some-bucket.s3.amazonaws.com/";

            expect(await encode("dir/sub dir/file.txt")).to.equal(`${path}dir/sub%20dir/file.txt`);
            expect(await encode("table/_delta_log/")).to.equal(`${path}table/_delta_log/`);
            expect(await encode("a%2Fb.txt")).to.equal(`${path}a%2Fb.txt`);
        });

        const NON_AWS = {
            hostname: "s3.example.com",
            bucket: "my-bucket",
            key: "table/_delta_log/_last_checkpoint",
        };
        const VIRTUAL = "https://my-bucket.s3.example.com/table/_delta_log/_last_checkpoint";
        const PATH = "https://s3.example.com/my-bucket/table/_delta_log/_last_checkpoint";

        function serviceProbing(head: () => Promise<{ status: number }>) {
            const service = new S3StorageService();
            const probed: string[] = [];
            ((service as unknown) as {
                httpClient: { head: (url: string) => Promise<{ status: number }> };
            }).httpClient = {
                head: async (url: string) => {
                    probed.push(url);
                    return head();
                },
            };
            return { service, probed };
        }

        const probeOutcomes: { status: number; expected: string; why: string }[] = [
            { status: 200, expected: VIRTUAL, why: "the bucket is served here" },
            { status: 403, expected: VIRTUAL, why: "it exists, we may just not list it" },
            { status: 401, expected: VIRTUAL, why: "it exists behind authentication" },
            { status: 301, expected: PATH, why: "it is addressed somewhere else" },
            { status: 404, expected: PATH, why: "no such virtual host" },
            { status: 500, expected: PATH, why: "the host cannot answer" },
            { status: 503, expected: PATH, why: "the host cannot answer" },
        ];

        probeOutcomes.forEach(({ status, expected, why }) => {
            it(`falls ${
                expected === PATH ? "back to path" : "through to virtual"
            } style on ${status} (${why})`, async () => {
                const { service } = serviceProbing(async () => ({ status }));

                expect(await service.formatAsHttpResource(NON_AWS)).to.equal(expected);
            });
        });
    });

    describe("getObjectsInDirectory", () => {
        it("fetches all paginated object listing pages", async () => {
            const s3StorageService = new S3StorageService();
            const originalDOMParser = (globalThis as any).DOMParser;

            (globalThis as any).DOMParser = class {
                public parseFromString(data: string) {
                    const keyMatches = [...data.matchAll(/<Key>(.*?)<\/Key>/g)].map(
                        (match) => match[1]
                    );
                    const tokenMatch = data.match(
                        /<NextContinuationToken>(.*?)<\/NextContinuationToken>/
                    );

                    return {
                        getElementsByTagName: (tagName: string) => {
                            if (tagName === "Key") {
                                return keyMatches.map((key) => ({ textContent: key }));
                            }

                            if (tagName === "NextContinuationToken") {
                                return tokenMatch ? [{ textContent: tokenMatch[1] }] : [];
                            }

                            return [];
                        },
                    };
                }
            };

            let callCount = 0;
            ((s3StorageService as unknown) as {
                httpClient: { get: (url: string) => Promise<{ data: string }> };
            }).httpClient = {
                get: async () => {
                    callCount += 1;
                    if (callCount === 1) {
                        return {
                            data: `
                                <ListBucketResult>
                                    <Contents><Key>prefix/file-1.bin</Key></Contents>
                                    <NextContinuationToken>TOKEN-1</NextContinuationToken>
                                </ListBucketResult>
                            `,
                        };
                    }

                    return {
                        data: `
                            <ListBucketResult>
                                <Contents><Key>prefix/file-2.bin</Key></Contents>
                            </ListBucketResult>
                        `,
                    };
                },
            };

            try {
                const objects = [];
                for await (const object of s3StorageService.getObjectsInDirectory({
                    hostname: "example-bucket.s3.amazonaws.com",
                    bucket: "example-bucket",
                    key: "prefix",
                } as any)) {
                    objects.push(object);
                }

                expect(callCount).to.equal(2);
                expect(objects.map((object) => object.name)).to.deep.equal([
                    "prefix/file-1.bin",
                    "prefix/file-2.bin",
                ]);
            } finally {
                (globalThis as any).DOMParser = originalDOMParser;
            }
        });
    });
});
