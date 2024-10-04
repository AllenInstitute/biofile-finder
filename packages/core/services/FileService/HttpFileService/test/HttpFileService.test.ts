import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import HttpFileService from "..";
import FileSelection from "../../../../entity/FileSelection";
import FileSet from "../../../../entity/FileSet";
import NumericRange from "../../../../entity/NumericRange";
import FileDownloadServiceNoop from "../../../FileDownloadService/FileDownloadServiceNoop";

describe("HttpFileService", () => {
    const baseUrl = "test";
    const fileIds = ["abc123", "def456", "ghi789", "jkl012"];
    const files = fileIds.map((file_id) => ({
        file_id,
    }));

    describe("getFiles", () => {
        const httpClient = createMockHttpClient([
            {
                when: () => true,
                respondWith: {
                    data: {
                        data: files.slice(0, 1),
                    },
                },
            },
        ]);

        it("issues request for files that match given parameters", async () => {
            const httpFileService = new HttpFileService({
                baseUrl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });
            const fileSet = new FileSet();
            const response = await httpFileService.getFiles({
                from: 0,
                limit: 1,
                fileSet,
            });
            const data = response;
            expect(data.length).to.equal(1);
            expect(data[0].id).to.equal(files[0]["file_id"]);
        });
    });

    describe("editFile", () => {
        const httpClient = createMockHttpClient([
            {
                when: () => true,
                respondWith: {},
            },
        ]);

        it("fails if unable to find id of annotation", async () => {
            // Arrange
            const httpFileService = new HttpFileService({
                baseUrl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });

            // Act / Assert
            try {
                await httpFileService.editFile("file_id", { ["Color"]: ["red"] });
                expect(false, "Expected to throw").to.be.true;
            } catch (e) {
                /* noop */
            }
        });
    });

    describe("getEdittableFileMetadata", () => {
        const colorAnnotation = "Color";
        const colorAnnotationId = 3;
        const fileIdWithColorAnnotation = "abc123";
        const fileIdWithoutColorAnnotation = "def456";
        const httpClient = createMockHttpClient([
            {
                when: (config) =>
                    !!config.url?.includes(`filemetadata/${fileIdWithColorAnnotation}`),
                respondWith: {
                    data: {
                        data: [
                            {
                                fileId: "abc123",
                                annotations: [
                                    {
                                        annotationId: colorAnnotationId,
                                        values: ["red"],
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
            {
                when: (config) =>
                    !!config.url?.includes(`filemetadata/${fileIdWithoutColorAnnotation}`),
                respondWith: {
                    data: {
                        data: [
                            {
                                fileId: "abc123",
                                annotations: [
                                    {
                                        annotationId: 4,
                                        values: ["AICS-0"],
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
            {
                when: (config) => !!config.url?.includes(`annotation/${colorAnnotation}`),
                respondWith: {
                    data: {
                        data: [
                            {
                                annotationId: colorAnnotationId,
                            },
                        ],
                    },
                },
            },
        ]);

        it("converts response into a map of file_id to metadata", async () => {
            const httpFileService = new HttpFileService({
                baseUrl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });

            // fails if cache is not prepared beforehand
            await httpFileService.prepareAnnotationIdCache([colorAnnotation]);

            // Act
            const fileMetadata = await httpFileService.getEdittableFileMetadata([
                fileIdWithColorAnnotation,
            ]);

            // Assert
            expect(fileMetadata).to.deep.equal({
                [fileIdWithColorAnnotation]: {
                    [colorAnnotation]: ["red"],
                },
            });
        });

        it("fails if unable to find id of annotation", async () => {
            const httpFileService = new HttpFileService({
                baseUrl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });

            // Act / Assert
            try {
                await httpFileService.getEdittableFileMetadata([fileIdWithoutColorAnnotation]);
                expect(false, "Expected to throw").to.be.true;
            } catch (e) {
                /* noop */
            }
        });
    });

    describe("getAggregateInformation", () => {
        const totalFileSize = 12424114;
        const totalFileCount = 7;
        const httpClient = createMockHttpClient({
            when: `${baseUrl}/${HttpFileService.SELECTION_AGGREGATE_URL}`,
            respondWith: {
                data: {
                    data: [{ count: totalFileCount, size: totalFileSize }],
                },
            },
        });

        it("issues request for aggregated information about given files", async () => {
            // Arrange
            const fileService = new HttpFileService({
                baseUrl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });
            const selection = new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });

            // Act
            const { count, size } = await fileService.getAggregateInformation(selection);

            // Assert
            expect(count).to.equal(totalFileCount);
            expect(size).to.equal(totalFileSize);
        });
    });

    describe("getCountOfMatchingFiles", () => {
        const httpClient = createMockHttpClient({
            when: `${baseUrl}/${HttpFileService.BASE_FILE_COUNT_URL}`,
            respondWith: {
                data: {
                    data: [2],
                },
            },
        });

        it("issues request for count of files matching given parameters", async () => {
            const fileService = new HttpFileService({
                baseUrl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });
            const fileSet = new FileSet();
            const count = await fileService.getCountOfMatchingFiles(fileSet);
            expect(count).to.equal(2);
        });
    });
});
