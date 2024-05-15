import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import DatasetService from "..";

describe("DataSourceService", () => {
    const baseUrl = "test";
    const expectedDatasetId = "abc123";
    const expectedDatasets = [expectedDatasetId, "def456", "ghi789"].map((id) => ({
        id,
        name: "Something" + id,
        version: 1,
    }));

    describe("getAll", () => {
        const httpClient = createMockHttpClient({
            when: `${baseUrl}/${DatasetService.BASE_DATASET_URL}`,
            respondWith: {
                data: {
                    data: expectedDatasets,
                },
            },
        });

        it("issues request for datasets", async () => {
            // Arrange
            const service = new DatasetService({
                baseUrl,
                httpClient,
                userName: "test",
            });

            // Act
            const datasets = await service.getAll();

            // Assert
            expect(datasets).to.deep.equal(expectedDatasets);
        });
    });
});
