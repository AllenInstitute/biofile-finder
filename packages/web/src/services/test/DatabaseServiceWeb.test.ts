import { expect } from "chai";

import DatabaseServiceWeb from "../DatabaseServiceWeb";

describe("DatabaseServiceWeb", () => {
    const service = new DatabaseServiceWeb();

    before(async () => {
        await service.initialize();
    });

    after(() => {
        service.close();
    });

    describe("addDataSource", () => {
        it(`creates table from csv file`, async () => {
            // Arrange
            const tempSourceName = "test";

            // Act
            service.addDataSource({
                name: tempSourceName,
                type: "csv",
                uri:
                    "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/Variance+Paper+Dataset.csv",
            });

            // Assert
            const result = await service.query(`SELECT * FROM ${tempSourceName} LIMIT 2`);
            expect(result).to.be.lengthOf(2);
        });
    });

    describe("query", () => {
        it("executes a query", async () => {
            // Act
            const result = service.query("SELECT * FROM INFORMATION_SCHEMA.TABLES");

            // Assert
            expect(result).to.be.lengthOf(0);
        });
    });

    describe("saveQuery", () => {
        ["csv", "json", "parquet"].forEach((type: any) => {
            it(`saves query out to a ${type} file`, async () => {
                // Arrange
                const sql = "SELECT * FROM INFORMATION_SCHEMA.TABLES";
                const format = "csv";

                // Act
                const result = await service.saveQuery("test.csv", sql, format);

                // Assert
                expect(result).to.not.be.undefined;
            });
        });
    });
});
