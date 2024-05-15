import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import sinon from "sinon";

import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";

import DatasetService, { PythonicDataAccessSnippet } from "..";

describe("DatasetService", () => {
    const baseUrl = "test";
    const expectedDatasetId = "abc123";
    const expectedDatasets = [expectedDatasetId, "def456", "ghi789"].map((id) => ({
        id,
        name: "Something" + id,
        version: 1,
    }));

    describe("getDatasets", () => {
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
            const datasets = await service.getDatasets();

            // Assert
            expect(datasets).to.deep.equal(expectedDatasets);
        });
    });

    describe("getPythonicDataAccessSnippet", () => {
        it("returns requested Pythonic dataset access snippet", async () => {
            // Arrange
            const datasetName = "foo";
            const datasetVersion = 3;

            const expected: PythonicDataAccessSnippet = {
                setup: "pip install foobar",
                code: "import foobar; foobar.baz()",
            };

            const httpClient = createMockHttpClient({
                when: `${baseUrl}/${DatasetService.BASE_DATASET_URL}/${datasetName}/${datasetVersion}/pythonSnippet`,
                respondWith: {
                    data: {
                        data: [expected],
                    },
                },
            });
            const service = new DatasetService({
                baseUrl,
                httpClient,
            });

            // Act
            const snippet = await service.getPythonicDataAccessSnippet(datasetName, datasetVersion);

            // Assert
            expect(snippet).to.deep.equal(expected);
        });

        it("encodes dataset name in URL path", async () => {
            // Arrange
            const datasetName = "files & more?";
            const encodedDatasetName = "files%20%26%20more%3F";
            const datasetVersion = 3;
            const expectedUrl = `${baseUrl}/${DatasetService.BASE_DATASET_URL}/files%20%26%20more%3F/${encodedDatasetName}/pythonSnippet`;

            const httpClient = createMockHttpClient();
            const getStub = sinon.stub(httpClient, "get").resolves({
                data: {
                    data: [{}],
                },
                status: 200,
                statusText: "OK",
            });
            const service = new DatasetService({
                baseUrl,
                httpClient,
            });

            // Act
            await service.getPythonicDataAccessSnippet(datasetName, datasetVersion);

            // Assert
            getStub.calledOnceWith(expectedUrl);
        });
    });
});
