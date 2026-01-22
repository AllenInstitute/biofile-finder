import { expect } from "chai";

import FileDownloadServiceNoop from "../FileDownloadServiceNoop";

interface S3TestObject {
    url: string;
    expected: {
        hostname: string;
        bucket: string;
        key: string;
    };
}

describe("FileDownloadService", () => {
    // This uses an external package, so is mostly just a consistency check
    describe("parseUrl", () => {
        const fileDownloadService = new FileDownloadServiceNoop();

        const testUrls: S3TestObject[] = [
            {
                // Path style
                url: "https://s3.region.amazonaws.com/some-bucket.org/testfile",
                expected: {
                    hostname: "s3.region.amazonaws.com",
                    bucket: "some-bucket.org",
                    key: "testfile",
                },
            },
            {
                url: "https://s3.region.amazonaws.com/some-bucket/key/with/multiple/parts",
                expected: {
                    hostname: "s3.region.amazonaws.com",
                    bucket: "some-bucket",
                    key: "key/with/multiple/parts",
                },
            },
            {
                // Virtually-hosted style
                url: "https://some-bucket.s3-aws-region.amazonaws.com/testfile",
                expected: {
                    hostname: "s3-aws-region.amazonaws.com",
                    bucket: "some-bucket",
                    key: "testfile",
                },
            },
            {
                // S3 protocol
                url: "s3://some-bucket/path/to/testfile",
                expected: {
                    hostname: "s3.amazonaws.com",
                    bucket: "some-bucket",
                    key: "path/to/testfile",
                },
            },
        ];

        testUrls.forEach(({ url, expected }, idx) => {
            it(`(${idx}) parses standard s3 url correctly`, async () => {
                // Act
                const parsedUrl = await fileDownloadService.parseUrl(url);

                // Assert
                expect(parsedUrl).to.not.be.undefined;
                expect(parsedUrl?.hostname).to.equal(expected.hostname);
                expect(parsedUrl?.bucket).to.equal(expected.bucket);
                expect(parsedUrl?.key).to.equal(expected.key);
            });
        });

        it("parses virtualized s3 url", async () => {
            // Act
            const parsedUrl = await fileDownloadService.parseUrl(
                "https://example.com/directory-name/path/to/file.zarr"
            );

            // Assert
            expect(parsedUrl).to.not.be.undefined;
            expect(parsedUrl?.hostname).to.equal("example.com");
            expect(parsedUrl?.key).to.equal("directory-name/path/to/file.zarr");
            expect(parsedUrl?.bucket).to.equal("");
        });
    });
});
