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
    describe("parseS3Url", () => {
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
            it(`(${idx}) parses url correctly`, () => {
                const { hostname, key, bucket } = fileDownloadService.parseS3Url(url);
                expect(hostname).to.equal(expected.hostname);
                expect(bucket).to.equal(expected.bucket);
                expect(key).to.equal(expected.key);
            });
        });
    });

    describe("parseVirtualizedUrl", () => {
        const fileDownloadService = new FileDownloadServiceNoop();
        it("parses url correctly", () => {
            const { hostname, key, bucket } = fileDownloadService.parseVirtualizedUrl(
                "https://example.com/directory-name/path/to/file.zarr"
            );
            expect(hostname).to.equal("example.com");
            expect(key).to.equal("directory-name/path/to/file.zarr");
            expect(bucket).to.equal("");
        });
    });
});
