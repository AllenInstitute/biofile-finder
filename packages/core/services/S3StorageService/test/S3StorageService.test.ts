import { expect } from "chai";

import S3StorageService from "..";

describe("S3StorageService", () => {
    // This uses an external package, so is mostly just a consistency check
    describe("formatAsHttpResource", () => {
        const s3StorageService = new S3StorageService();

        const testUrls = [
            {
                // Path style
                url: "https://s3.region.amazonaws.com/some-bucket.org/testfile",
                expected: "https://s3.region.amazonaws.com/some-bucket.org/testfile",
            },
            {
                url: "https://s3.region.amazonaws.com/some-bucket/key/with/multiple/parts",
                expected:
                    "https://s3.region.amazonaws.com/some-bucket/key%2Fwith%2Fmultiple%2Fparts",
            },
            {
                // Virtually-hosted style
                url: "https://some-bucket.s3-aws-region.amazonaws.com/testfile",
                expected: "https://s3-aws-region.amazonaws.com/some-bucket/testfile",
            },
            {
                // S3 protocol
                url: "s3://some-bucket/path/to/testfile",
                expected: "https://s3.amazonaws.com/some-bucket/path%2Fto%2Ftestfile",
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
                "https://s3.us-west-2.amazonaws.com/animatedcell-test-data/variance%2F10005.zarr"
            );
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
