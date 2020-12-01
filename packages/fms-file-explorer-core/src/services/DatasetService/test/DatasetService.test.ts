import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import DatasetService, { PythonicDataAccessSnippet } from "..";

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
                        data: [{ id: expectedDatasetId }],
                    },
                },
            },
        ]);

        it("issues request to create dataset matching given parameters", async () => {
            // Arrange
            const service = new DatasetService({ baseUrl, httpClient });

            // Act
            const dataset = await service.createDataset({
                name: "anyName",
                annotations: [],
                selections: [],
            });
            expect(dataset.id).to.equal(expectedDatasetId);
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
            expect(datasets).to.deep.equal(expectedDatasets);
        });
    });

    describe("getPythonicDataAccessSnippet", () => {
        const DATASET_NAME = "foo";
        const DATASET_VERSION = 3;

        const expected: PythonicDataAccessSnippet = {
            setup: "pip install foobar",
            code: "import foobar; foobar.baz()",
        };

        const httpClient = createMockHttpClient({
            when: `${baseUrl}/file-explorer-service/1.0/dataset/${DATASET_NAME}/${DATASET_VERSION}/pythonSnippet`,
            respondWith: {
                data: {
                    data: [expected],
                },
            },
        });

        it("returns requested Pythonic dataset access snippet", async () => {
            // Arrange
            const service = new DatasetService({ baseUrl, httpClient });

            // Act
            const snippet = await service.getPythonicDataAccessSnippet(
                DATASET_NAME,
                DATASET_VERSION
            );

            // Assert
            expect(snippet).to.deep.equal(expected);
        });
    });
});
