import { expect } from "chai";

import DatabaseService from "../../../DatabaseService";
import FileSelection from "../../../../entity/FileSelection";
import FileSet from "../../../../entity/FileSet";
import NumericRange from "../../../../entity/NumericRange";
import SQLBuilder from "../../../../entity/SQLBuilder";
import DatabaseServiceNoop from "../../../DatabaseService/DatabaseServiceNoop";
import FileDownloadServiceNoop from "../../../FileDownloadService/FileDownloadServiceNoop";

import DatabaseFileService from "..";

describe("DatabaseFileService", () => {
    const totalFileSize = 864452;
    const fileIds = ["abc123", "def456"];
    const files = fileIds.map((file_id) => ({
        [DatabaseService.HIDDEN_UID_ANNOTATION]: file_id,
        "File Size": `${totalFileSize / 2}`,
        "File Path": "path/to/file",
        "File Name": "file",
        num_files: "6",
    }));

    class MockDatabaseService extends DatabaseServiceNoop {
        public query(): Promise<{ [key: string]: string }[]> {
            return Promise.resolve(files);
        }
    }
    const databaseService = new MockDatabaseService();

    describe("getFiles", () => {
        it("issues request for files that match given parameters", async () => {
            const databaseFileService = new DatabaseFileService({
                dataSourceNames: ["whatever", "and another"],
                databaseService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const fileSet = new FileSet();
            const response = await databaseFileService.getFiles({
                from: 0,
                limit: 1,
                fileSet,
            });
            const data = response;
            expect(data.length).to.equal(2);
            expect(data[0].details).to.deep.equal({
                annotations: [
                    {
                        name: "File Size",
                        values: ["432226"],
                    },
                    {
                        name: "File Path",
                        values: ["path/to/file"],
                    },
                    {
                        name: "File Name",
                        values: ["file"],
                    },
                    {
                        name: "num_files",
                        values: ["6"],
                    },
                ],
            });
        });
    });

    describe("getAggregateInformation", () => {
        it("issues request for aggregated information about given files", async () => {
            // Arrange
            const fileService = new DatabaseFileService({
                dataSourceNames: ["whatever"],
                databaseService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const selection = new FileSelection().select({
                fileSet: new FileSet({ fileService }),
                index: new NumericRange(0, 1),
                sortOrder: 0,
            });

            // Act
            const { count, size } = await fileService.getAggregateInformation(selection);

            // Assert
            expect(count).to.equal(2);
            expect(size).to.equal(totalFileSize);
        });
    });

    describe("getCountOfMatchingFiles", () => {
        it("issues request for count of files matching given parameters", async () => {
            const fileService = new DatabaseFileService({
                dataSourceNames: ["whatever"],
                databaseService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const fileSet = new FileSet();
            const count = await fileService.getCountOfMatchingFiles(fileSet);
            expect(count).to.equal(6);
        });
    });

    describe("applySelectionFilters", () => {
        // Setup
        let databaseFileService: DatabaseFileService;
        let sqlBuilder: SQLBuilder;

        beforeEach(() => {
            databaseFileService = new DatabaseFileService({
                dataSourceNames: ["mock_source"],
                databaseService,
                downloadService: new FileDownloadServiceNoop(),
            });

            sqlBuilder = new SQLBuilder().select("*").from("mock_source");
        });

        // the sql we produce has new lines that mess up comparison
        function normalizeSQL(sql: string): string {
            return sql.replace(/\s+/g, " ").trim();
        }

        it("correctly modifies SQLBuilder for single index selections (CTRL selection)", () => {
            // Arrange
            const selections = [
                {
                    indexRanges: [
                        { start: 0, end: 0 },
                        { start: 2, end: 2 },
                    ], // Two uniqe files
                    filters: {},
                    sort: undefined,
                },
            ];

            // Act
            databaseFileService["applySelectionFilters"](sqlBuilder, selections);
            const modifiedSQL = normalizeSQL(sqlBuilder.toSQL());

            // Assert
            expect(modifiedSQL).to.include("OFFSET 0 LIMIT 1");
            expect(modifiedSQL).to.include("OFFSET 2 LIMIT 1");
        });

        it("correctly modifies SQLBuilder for contiguous range selections (Shift selection)", () => {
            // Arrange
            const selections = [
                {
                    indexRanges: [{ start: 0, end: 2 }], // File range
                    filters: {},
                    sort: undefined,
                },
            ];

            // Act
            databaseFileService["applySelectionFilters"](sqlBuilder, selections);
            const modifiedSQL = normalizeSQL(sqlBuilder.toSQL());

            // Assert
            expect(modifiedSQL).to.include("OFFSET 0 LIMIT 3");
        });
    });
});
