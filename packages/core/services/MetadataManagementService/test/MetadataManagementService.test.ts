import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import MetadataManagementService from "..";

describe("MetadataManagementService", () => {
    const baseUrl = "test";
    const fileIds = ["abc123", "def456", "ghi789", "jkl012"];
    const files = fileIds.map((fileId) => ({
        fileId,
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
            const mmsService = new MetadataManagementService({
                baseUrl,
                httpClient,
            });
            const response = await mmsService.getFileMetadata(files[0]["fileId"]);
            expect(response.fileId).to.equal(files[0]["fileId"]);
        });
    });
});
