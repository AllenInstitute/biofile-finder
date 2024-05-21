// TODO: Need a publically available data source to properly test this
// https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues/66
describe("DatabaseServiceWeb", () => {
    // const service = new DatabaseServiceWeb();
    // before(async () => {
    //     await service.initialize();
    // })
    // after(() => {
    //     service.close();
    // })
    // describe("addDataSource", () => {
    //     ["csv", "json", "parquet"].forEach((type: any) => {
    //         it(`creates table from file of type ${type}`, async () => {
    //             // Arrange
    //             const tempFileName = `test.${type}`;
    //             const tempFile = path.resolve(tempDir, tempFileName);
    //             await fs.promises.writeFile(tempFile, "a,b,c\n1,2,3\n4,5,6\n");
    //             // Act
    //             service.addDataSource(tempFileName, type, tempFile);
    //             // Assert
    //             const result = await service.query(`SELECT * FROM ${tempFileName}`);
    //             expect(result).to.be.lengthOf(2);
    //         });
    //     });
    // });
    // describe("query", () => {
    //     it("executes a query", async () => {
    //         // Act
    //         const result = service.query("SELECT * FROM INFORMATION_SCHEMA.TABLES");
    //         // Assert
    //         expect(result).to.be.lengthOf(0);
    //     });
    // });
    // describe("saveQuery", () => {
    //     ["csv", "json", "parquet"].forEach((type: any) => {
    //         it(`saves query out to a ${type} file`, async () => {
    //             // Arrange
    //             const sql = "SELECT * FROM INFORMATION_SCHEMA.TABLES";
    //             const format = "csv";
    //             // Act
    //             const result = await service.saveQuery("test.csv", sql, format);
    //             // Assert
    //             expect(result).to.not.be.undefined;
    //         });
    //     });
    // });
});
