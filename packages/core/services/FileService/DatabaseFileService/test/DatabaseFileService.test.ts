import { expect } from "chai";
import { createSandbox, match } from "sinon";

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
        let sqlBuilder: SQLBuilder;

        beforeEach(() => {
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
                    ], // Two unique files
                    filters: {},
                    sort: undefined,
                },
            ];

            // Act
            DatabaseFileService.applySelectionFilters(sqlBuilder, selections, ["mock_source"]);
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
            DatabaseFileService.applySelectionFilters(sqlBuilder, selections, ["mock_source"]);
            const modifiedSQL = normalizeSQL(sqlBuilder.toSQL());

            // Assert
            expect(modifiedSQL).to.include("OFFSET 0 LIMIT 3");
        });

        it("correctly applies AND vs OR clauses", () => {
            const selectionsWithOR = [
                {
                    indexRanges: [{ start: 0, end: 2 }], // File range
                    filters: {
                        Structure: ["structure1", "structure2"],
                    },
                },
            ];
            const selectionsWithAND = [
                {
                    indexRanges: [{ start: 0, end: 2 }], // File range
                    filters: {
                        "Cell Line": ["AICS-01"],
                        Structure: ["structure1"],
                    },
                },
            ];
            // Make a separate SQLBuilder for comparison
            const sqlBuilderAND = new SQLBuilder().select("*").from("mock_source");

            // Act
            DatabaseFileService.applySelectionFilters(sqlBuilder, selectionsWithOR, [
                "mock_source",
            ]);
            const modifiedSQLWithOR = normalizeSQL(sqlBuilder.toSQL());
            DatabaseFileService.applySelectionFilters(sqlBuilderAND, selectionsWithAND, [
                "mock_source",
            ]);
            const modifiedSQLWithAND = normalizeSQL(sqlBuilderAND.toSQL());

            // Assert
            // Uses OR within single filter type
            expect(modifiedSQLWithOR).to.include("OR");
            expect(modifiedSQLWithOR).not.to.include("AND");
            // Uses AND between different filter types
            expect(modifiedSQLWithAND).to.include("AND");
            expect(modifiedSQLWithAND).not.to.include("OR");
        });
    });

    describe("editFiles", () => {
        const uidField = DatabaseService.HIDDEN_UID_ANNOTATION;
        const fileUid = "a1b2c3d4";
        const sandbox = createSandbox();
        afterEach(() => {
            sandbox.restore();
        });
        // Custom mock to allow spying on `execute` args
        class MockDatabaseEditService extends DatabaseService {
            public execute(_sql: string): Promise<void> {
                return Promise.resolve();
            }

            public saveQuery(): Promise<Uint8Array> {
                return Promise.reject("MockDatabaseEditService:saveQuery");
            }

            public query(): Promise<{ [key: string]: string }[]> {
                return Promise.reject("MockDatabaseEditService:query");
            }

            protected addDataSource(): Promise<void> {
                return Promise.reject("MockDatabaseEditService:addDataSource");
            }
        }
        const databaseEditService = new MockDatabaseEditService();

        it("issues request to edit files matching given parameters", async () => {
            // Arrange
            const fileService = new DatabaseFileService({
                dataSourceNames: ["Mock Source"],
                databaseService: databaseEditService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const sqlSpy = sandbox.spy(databaseEditService, "execute");
            const annotationName = "Test Annotation";
            const annotationValue = "Some value";
            // Act
            await fileService.editFile(fileUid, { [annotationName]: [annotationValue] });

            // Assert
            expect(sqlSpy.called).to.be.true;
            const regex = new RegExp(String.raw`WHERE ${uidField} \= \'${fileUid}\'`);
            expect(sqlSpy.calledWith(match(regex))).to.be.true;
        });

        it("issues request to edit single value for files", async () => {
            // Arrange
            const fileService = new DatabaseFileService({
                dataSourceNames: ["Mock Source"],
                databaseService: databaseEditService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const sqlSpy = sandbox.spy(databaseEditService, "execute");
            const annotationName = "Test Annotation";
            const annotationValue = "Some value";
            // Act
            await fileService.editFile(fileUid, { [annotationName]: [annotationValue] });

            // Assert
            expect(sqlSpy.called).to.be.true;
            const regex = new RegExp(
                String.raw`SET \"${annotationName}\" \= \'${annotationValue}\'`
            );
            expect(sqlSpy.calledWith(match(regex))).to.be.true;
        });

        it("issues request to edit multiple annotations for files", async () => {
            // Arrange
            const fileService = new DatabaseFileService({
                dataSourceNames: ["Mock Source"],
                databaseService: databaseEditService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const sqlSpy = sandbox.spy(databaseEditService, "execute");
            const annotationName1 = "Test Annotation 1";
            const annotationName2 = "Test Annotation 2";

            const annotationValue = "Some value";
            // Act
            await fileService.editFile(fileUid, {
                [annotationName1]: [annotationValue],
                [annotationName2]: [annotationValue],
            });

            // Assert
            expect(sqlSpy.called).to.be.true;
            const regex = new RegExp(
                String.raw`SET \"${annotationName1}\" \= \'${annotationValue}\', \"${annotationName2}\" \=`
            );
            expect(sqlSpy.calledWith(match(regex))).to.be.true;
        });

        it("issues request to delete metadata from files", async () => {
            const fileService = new DatabaseFileService({
                dataSourceNames: ["Mock Source"],
                databaseService: databaseEditService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const sqlSpy = sandbox.spy(databaseEditService, "execute");
            const annotationName = "Test Annotation";
            await fileService.editFile(fileUid, { [annotationName]: [] });

            expect(sqlSpy.called).to.be.true;
            const regex = new RegExp(String.raw`SET \"${annotationName}\" \= NULL`);
            expect(sqlSpy.calledWith(match(regex))).to.be.true;
        });
    });
});
