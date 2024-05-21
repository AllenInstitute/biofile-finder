import { expect } from "chai";

import DatasetService from "..";

describe("DataSourceService", () => {
    describe("getAll", () => {
        it("issues request for datasets", async () => {
            // Arrange
            const service = new DatasetService();

            // Act
            const datasets = await service.getAll();

            // Assert
            expect(datasets).to.deep.equal([]);
        });
    });
});
