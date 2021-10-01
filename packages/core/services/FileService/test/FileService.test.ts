import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import FileService from "..";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";

describe("FileService", () => {
    const baseUrl = "test";
    const fileIds = ["abc123", "def456", "ghi789", "jkl012"];
    const files = fileIds.map((file_id) => {
        file_id;
    });

    describe("getFiles", () => {
        const httpClient = createMockHttpClient([
            {
                when: `${baseUrl}/file-explorer-service/1.0/files`,
                respondWith: {
                    data: {
                        data: files,
                    },
                },
            },
            {
                when: `${baseUrl}/file-explorer-service/1.0/files?from=0&limit=1&file_id=abc123`,
                respondWith: {
                    data: {
                        data: files.slice(0, 1),
                    },
                },
            },
        ]);

        it("issues request for files that match given parameters", async () => {
            const fileService = new FileService({ baseUrl, httpClient });
            const response = await fileService.getFiles({
                from: 0,
                limit: 1,
                queryString: "file_id=abc123",
            });
            const data = response.data;
            expect(data.length).to.equal(1);
            expect(data[0]).to.equal(files[0]);
        });
    });

    describe("getAggregateInformation", () => {
        const totalFileSize = 12424114;
        const totalFileCount = 7;
        const httpClient = createMockHttpClient({
            when: `${baseUrl}/${FileService.SELECTION_AGGREGATE_URL}`,
            respondWith: {
                data: {
                    data: [{ count: totalFileCount, size: totalFileSize }],
                },
            },
        });

        it("issues request for aggregated information about given files", async () => {
            // Arrange
            const fileService = new FileService({ baseUrl, httpClient });
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
            when: `${baseUrl}/file-explorer-service/1.0/files/count?file_id=abc123&file_id=def456`,
            respondWith: {
                data: {
                    data: [2],
                },
            },
        });

        it("issues request for count of files matching given parameters", async () => {
            const fileService = new FileService({ baseUrl, httpClient });
            const count = await fileService.getCountOfMatchingFiles(
                "file_id=abc123&file_id=def456"
            );
            expect(count).to.equal(2);
        });
    });
});
