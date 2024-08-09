import { expect } from "chai";
import { orderBy } from "lodash";
import * as sinon from "sinon";

import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import { Source } from "../../../entity/FileExplorerURL";

import DataSourceService from "..";

describe("DataSourceService", () => {
    describe("getAll", () => {
        it("gets both public and user supplied data sources", async () => {
            // Arrange
            const databaseServiceMock = new DatabaseServiceNoop();
            const publicDataSources = [
                {
                    name: "Public Data Source",
                    type: "csv",
                    uri: "https://example.com/data.csv",
                },
            ];
            const userSuppliedDataSources: Source[] = [
                {
                    name: "User Supplied Data Source",
                    type: "csv",
                    uri: "https://example.com/data.csv",
                },
            ];
            sinon.stub(databaseServiceMock, "query").resolves(publicDataSources);
            sinon.stub(databaseServiceMock, "getDataSources").returns(userSuppliedDataSources);
            sinon.stub(databaseServiceMock, "prepareDataSources").resolves();

            const service = new DataSourceService(databaseServiceMock, "staging");

            // Act
            const datasets = await service.getAll();

            // Assert
            expect(orderBy(datasets, "name")).to.deep.equal(
                orderBy([...publicDataSources, ...userSuppliedDataSources], "name")
            );
        });
    });
});
