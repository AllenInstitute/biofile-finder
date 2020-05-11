import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import FileService from "..";

describe("FileService", () => {
    const baseUrl = "test";
    const fileIds = ["abc123", "def456", "ghi789", "jkl012"];
    const files = fileIds.map((fileId) => {
        fileId;
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
                when: `${baseUrl}/file-explorer-service/1.0/files?from=0&limit=1&fileId=abc123`,
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
                queryString: "fileId=abc123",
            });
            const data = response.data;
            expect(data.length).to.equal(1);
            expect(data[0]).to.equal(files[0]);
        });
    });

    describe("getFileIds", () => {
        const httpClient = createMockHttpClient({
            when: `${baseUrl}/file-explorer-service/1.0/files/ids?fileId=abc123`,
            respondWith: {
                data: {
                    data: fileIds,
                },
            },
        });

        it("issues request for all file ids matching given parameters", async () => {
            const fileService = new FileService({ baseUrl, httpClient });
            const ids = await fileService.getFileIds("fileId=abc123");
            expect(ids).to.equal(fileIds);
        });
    });

    describe("getCountOfMatchingFiles", () => {
        const httpClient = createMockHttpClient({
            when: `${baseUrl}/file-explorer-service/1.0/files/count?fileId=abc123&fileId=def456`,
            respondWith: {
                data: {
                    data: [2],
                },
            },
        });

        it("issues request for count of files matching given parameters", async () => {
            const fileService = new FileService({ baseUrl, httpClient });
            const count = await fileService.getCountOfMatchingFiles("fileId=abc123&fileId=def456");
            expect(count).to.equal(2);
        });
    });
});
