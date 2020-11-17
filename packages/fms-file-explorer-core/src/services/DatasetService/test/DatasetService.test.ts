import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import DatasetService from "..";

describe("DatasetService", () => {
    const baseUrl = "test";
    const expectedDatasetId = "abc123";
    const expectedDatasets = [expectedDatasetId, "def456", "ghi789"].map((id) => ({
        id,
        name: "Something" + id,
        version: 1,
    }));

    describe("createDataset", () => {
        const httpClient = createMockHttpClient([
            {
                when: `${baseUrl}/file-explorer-service/1.0/dataset`,
                respondWith: {
                    data: {
                        data: [expectedDatasetId],
                    },
                },
            },
        ]);

        it("issues request to create dataset matching given parameters", async () => {
            // Arrange
            const service = new DatasetService({ baseUrl, httpClient });

            // Act
            const datasetId = await service.createDataset({
                name: "anyName",
                annotations: [],
                selections: [],
            });
            expect(datasetId).to.equal(expectedDatasetId);
        });
    });

    describe("getDatasets", () => {
        const httpClient = createMockHttpClient({
            when: `${baseUrl}/file-explorer-service/1.0/dataset`,
            respondWith: {
                data: {
                    data: expectedDatasets,
                },
            },
        });

        it("issues request for datasets", async () => {
            // Arrange
            const service = new DatasetService({ baseUrl, httpClient });

            // Act
            const datasets = await service.getDatasets();

            // Assert
            // TODO: expect(datasets).to.equal(expectedDatasets);
            expect(datasets).to.be.empty;
        });
    });
});
