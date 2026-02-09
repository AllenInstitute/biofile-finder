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
                "https://example.com/directory-name/path/to/file.zarr"
            );

            // Assert
            expect(reformattedUrl).to.equal(
                "https://example.com/directory-name%2Fpath%2Fto%2Ffile.zarr"
            );
        });
    });
});
