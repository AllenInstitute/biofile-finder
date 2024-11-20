import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";

import DatabaseServiceElectron from "../DatabaseServiceElectron";

describe("DatabaseServiceElectron", () => {
    const service = new DatabaseServiceElectron();
    const tempDir = path.join(os.tmpdir(), "DatabaseServiceElectronTest");

    before(async () => {
        await fs.promises.mkdir(tempDir);
    });

    beforeEach(async () => {
        await service.reset();
    });

    after(async () => {
        await fs.promises.rm(tempDir, { recursive: true });
        await service.close();
    });

    describe("prepareDataSources", () => {
        it("creates table from file of type csv", async () => {
            // Arrange
            const tempFileName = "test.csv";
            const tempFile = path.resolve(tempDir, tempFileName);
            await fs.promises.writeFile(tempFile, "file_path\nblue\ngreen\norange");

            // Act
            await service.prepareDataSources([{ name: tempFileName, type: "csv", uri: tempFile }]);

            // Assert
            const result = await service.query(`SELECT * FROM "${tempFileName}"`);
            expect(result).to.be.lengthOf(3);
        });

        it("creates table from file of type json", async () => {
            // Arrange
            const tempFileName = "test.json";
            const tempFile = path.resolve(tempDir, tempFileName);
            await fs.promises.writeFile(
                tempFile,
                JSON.stringify([
                    { file_path: "a", color: "blue" },
                    { file_path: "b", color: "green" },
                ])
            );

            // Act
            await service.prepareDataSources([{ name: tempFileName, type: "json", uri: tempFile }]);

            // Assert
            const result = await service.query(`SELECT * FROM "${tempFileName}"`);
            expect(result).to.be.lengthOf(2);
        });
    });

    describe("query", () => {
        it("executes a query", async () => {
            // Act
            const result = await service.query("SELECT * FROM INFORMATION_SCHEMA.TABLES");

            // Assert
            expect(result).to.be.lengthOf(0);
        });
    });

    describe("saveQuery", () => {
        ["csv", "json", "parquet"].forEach((type: any) => {
            it(`saves query out to a ${type} file`, async () => {
                // Arrange
                const destination = path.join(tempDir, "saveQueryTest");
                const sql = "SELECT * FROM INFORMATION_SCHEMA.TABLES";
                const format = "csv";

                // Act
                await service.saveQuery(destination, sql, format);

                // Assert
                const fileStat = await fs.promises.stat(`${destination}.${format}`);
                expect(fileStat.size).to.equal(215);
            });
        });
    });
});
