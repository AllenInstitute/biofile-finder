import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import HttpFileService from "..";
import { FESBaseUrl, LoadBalancerBaseUrl, MMSBaseUrl } from "../../../../constants";
import FileSelection from "../../../../entity/FileSelection";
import FileSet from "../../../../entity/FileSet";
import NumericRange from "../../../../entity/NumericRange";
import FileDownloadServiceNoop from "../../../FileDownloadService/FileDownloadServiceNoop";

describe("HttpFileService", () => {
    const fileExplorerServiceBaseUrl = FESBaseUrl.TEST;
    const loadBalancerBaseUrl = LoadBalancerBaseUrl.TEST;
    const metadataManagementServiceBaseURl = MMSBaseUrl.TEST;
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
                fileExplorerServiceBaseUrl: fileExplorerServiceBaseUrl,
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
                metadataManagementServiceBaseURl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });

            // Act / Assert
            try {
                await httpFileService.editFile(
                    "file_id",
                    { ["Color"]: ["red"] },
                    undefined,
                    "Unknown"
                );
                expect(false, "Expected to throw").to.be.true;
            } catch (e) {
                expect((e as Error).message).to.equal(
                    "Unable to edit file. Failed to find annotation id for annotation Color"
                );
            }
        });
    });

    describe("getAggregateInformation", () => {
        const totalFileSize = 12424114;
        const totalFileCount = 7;
        const httpClient = createMockHttpClient({
            when: `${fileExplorerServiceBaseUrl}/${HttpFileService.SELECTION_AGGREGATE_URL}`,
            respondWith: {
                data: {
                    data: [{ count: totalFileCount, size: totalFileSize }],
                },
            },
        });

        it("issues request for aggregated information about given files", async () => {
            // Arrange
            const fileService = new HttpFileService({
                fileExplorerServiceBaseUrl,
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

    describe("cacheFiles", () => {
        const httpClient = createMockHttpClient({
            when: `${loadBalancerBaseUrl}/${HttpFileService.BASE_FILE_CACHE_URL}`,
            respondWith: {
                data: {
                    cacheFileStatuses: {
                        abc123: "DOWNLOAD_COMPLETE",
                        def456: "ERROR",
                    },
                },
            },
        });

        it("sends file IDs to be cached and returns their statuses", async () => {
            // Arrange
            const fileService = new HttpFileService({
                loadBalancerBaseUrl: loadBalancerBaseUrl,
                httpClient,
                downloadService: new FileDownloadServiceNoop(),
            });
            const fileIds = ["abc123", "def456"];
            const username = "test.user";

            // Act
            const response = await fileService.cacheFiles(fileIds, username);

            // Assert
            expect(response).to.deep.equal({
                cacheFileStatuses: {
                    abc123: "DOWNLOAD_COMPLETE",
                    def456: "ERROR",
                },
            });
        });
    });
});
