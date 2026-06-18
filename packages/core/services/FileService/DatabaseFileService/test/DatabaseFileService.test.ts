import { expect } from "chai";
import { createSandbox, match } from "sinon";

import DatabaseService from "../../../DatabaseService";
import FileFilter from "../../../../entity/FileFilter";
import FileSelection from "../../../../entity/FileSelection";
import FileSet from "../../../../entity/FileSet";
import NumericRange from "../../../../entity/NumericRange";
import DatabaseServiceNoop from "../../../DatabaseService/DatabaseServiceNoop";
import FileDownloadServiceNoop from "../../../FileDownloadService/FileDownloadServiceNoop";
import { HIDDEN_UID_ANNOTATION } from "../../../../constants";

import DatabaseFileService from "..";

describe("DatabaseFileService", () => {
    const totalFileSize = 864452;
    const fileIds = ["abc123", "def456"];
    const files = fileIds.map((file_id) => ({
        [HIDDEN_UID_ANNOTATION]: file_id,
        "File Size": `${totalFileSize / 2}`,
        "File Path": "path/to/file",
        "File Name": "file",
        num_files: "6",
    }));

    class MockDatabaseService extends DatabaseServiceNoop {
        protected readonly existingDataSources = new Set(["MockDataSource"]);
        public query(): { promise: Promise<any> } {
            return { promise: Promise.resolve(files) };
        }
        public async fetchAnnotations(): Promise<[]> {
            return [];
        }
    }
    const databaseService = new MockDatabaseService();

    describe("getFiles", () => {
        const sandbox = createSandbox();
        afterEach(() => {
            sandbox.restore();
        });

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
            // metadata is a Map — convert to a plain object for a readable deep-equal assertion
            expect(Object.fromEntries(data[0].metadata)).to.deep.equal({
                "File Size": ["432226"],
                "File Path": ["path/to/file"],
                "File Name": ["file"],
                num_files: ["6"],
            });
        });

        it("sorts parquets by hidden_bff_uid when offset is used", async () => {
            // Arrange
            const parquetFiles = [
                {
                    [HIDDEN_UID_ANNOTATION]: "1",
                    "File ID": "123",
                },
            ];
            class MockParquetDatabaseService extends DatabaseServiceNoop {
                protected readonly existingDataSources = new Set(["parquet_source"]);
                public query(_sql?: string): { promise: Promise<any> } {
                    return { promise: Promise.resolve(parquetFiles) };
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }
            const mockDbService = new MockParquetDatabaseService();
            const querySpy = sandbox.spy(mockDbService, "query");

            const databaseFileService = new DatabaseFileService({
                dataSourceNames: ["parquet_source"],
                databaseService: mockDbService,
                downloadService: new FileDownloadServiceNoop(),
            });
            // Act
            await databaseFileService.getFiles({
                // This is a regression test. OFFSET 0 was a specific edge case
                from: 0,
                limit: 10,
                fileSet: new FileSet(),
            });

            // Assert
            expect(querySpy.calledWith(match(/ORDER BY\s+hidden_bff_uid/i))).to.be.true;
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
                dataSourceNames: ["MockDataSource"],
                databaseService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const fileSet = new FileSet();
            const count = await fileService.getCountOfMatchingFiles(fileSet);
            expect(count).to.equal(6);
        });
    });

    describe("editFiles", () => {
        const uidField = HIDDEN_UID_ANNOTATION;
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

            public query(): { promise: Promise<any> } {
                return { promise: Promise.reject("MockDatabaseEditService:query") };
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

    describe("getManifest", () => {
        const sandbox = createSandbox();
        afterEach(() => {
            sandbox.restore();
        });

        it("uses hidden_bff_uid to select files", async () => {
            // Arrange
            class MockParquetManifestService extends DatabaseServiceNoop {
                protected readonly existingDataSources = new Set(["parquet_source"]);
                public saveQuery(
                    _destination?: string,
                    _sql?: string,
                    _format?: string
                ): Promise<Uint8Array> {
                    return Promise.resolve(new Uint8Array());
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }
            const mockDbService = new MockParquetManifestService();
            const saveQuerySpy = sandbox.spy(mockDbService, "saveQuery");

            const databaseFileService = new DatabaseFileService({
                dataSourceNames: ["parquet_source"],
                databaseService: mockDbService,
                downloadService: new FileDownloadServiceNoop(),
            });

            const selections = [
                {
                    indexRanges: [{ start: 5, end: 7 }],
                    filters: [],
                    sort: undefined,
                },
            ];

            // Act
            await databaseFileService.getManifest(["File ID"], selections, "csv");

            // Assert
            const any = match(/.*/);
            expect(saveQuerySpy.calledWith(any, match(/hidden_bff_uid\s+IN\s*\(/i), any)).to.be
                .true;
        });

        it("fails on nested annotation paths for CSV format", async () => {
            // Arrange
            class MockParquetManifestService extends DatabaseServiceNoop {
                protected readonly existingDataSources = new Set(["parquet_source"]);
                public saveQuery(
                    _destination?: string,
                    _sql?: string,
                    _format?: string
                ): Promise<Uint8Array> {
                    return Promise.resolve(new Uint8Array());
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }
            const mockDbService = new MockParquetManifestService();
            const databaseFileService = new DatabaseFileService({
                dataSourceNames: ["parquet_source"],
                databaseService: mockDbService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const selections = [
                { indexRanges: [{ start: 0, end: 1 }], filters: [], sort: undefined },
            ];

            try {
                // Act
                await databaseFileService.getManifest(
                    ["File Name", "Well.Dose.Unit"],
                    selections,
                    "csv"
                );
                expect.fail("Expected error was not thrown");
            } catch (error) {
                // Assert: CSV format — nested column extracted and stringified with array_to_string
                expect((error as Error).message).to.equal(
                    "CSV manifest does not support nested annotation paths"
                );
            }
        });

        it("reconstructs a partial struct for parquet to include only selected sub-fields", async () => {
            class MockParquetManifestService extends DatabaseServiceNoop {
                protected readonly existingDataSources = new Set(["parquet_source"]);
                public saveQuery(
                    _destination?: string,
                    _sql?: string,
                    _format?: string
                ): Promise<Uint8Array> {
                    return Promise.resolve(new Uint8Array());
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }
            const mockDbService = new MockParquetManifestService();
            const saveQuerySpy = sandbox.spy(mockDbService, "saveQuery");
            const databaseFileService = new DatabaseFileService({
                dataSourceNames: ["parquet_source"],
                databaseService: mockDbService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const selections = [
                { indexRanges: [{ start: 0, end: 1 }], filters: [], sort: undefined },
            ];

            // Only "Well.Color" is selected — sibling "Well.Name" must NOT appear.
            await databaseFileService.download(["File Name", "Well.Color"], selections, "parquet");

            const sql = saveQuerySpy.firstCall.args[1] as string;
            expect(sql).to.include(`"File Name"`);
            // Partial struct contains only the selected field
            expect(sql).to.include(
                `list_transform("Well", __e -> {'Color': __e."Color"}) AS "Well"`
            );
            // Unselected sibling "Name" must not appear anywhere
            expect(sql).to.not.include(`"Name"`);
            // No array_to_string (that's the CSV/JSON path)
            expect(sql).to.not.include("array_to_string");
        });

        it("groups multiple sub-fields of the same root into one partial struct for parquet", async () => {
            class MockParquetManifestService extends DatabaseServiceNoop {
                protected readonly existingDataSources = new Set(["parquet_source"]);
                public saveQuery(
                    _destination?: string,
                    _sql?: string,
                    _format?: string
                ): Promise<Uint8Array> {
                    return Promise.resolve(new Uint8Array());
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }
            const mockDbService = new MockParquetManifestService();
            const saveQuerySpy = sandbox.spy(mockDbService, "saveQuery");
            const databaseFileService = new DatabaseFileService({
                dataSourceNames: ["parquet_source"],
                databaseService: mockDbService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const selections = [
                { indexRanges: [{ start: 0, end: 1 }], filters: [], sort: undefined },
            ];

            // "Well.Dose.Unit" and "Well.Dose.Value" — both under the same root, sharing "Dose".
            await databaseFileService.download(
                ["File Name", "Well.Dose.Unit", "Well.Dose.Value"],
                selections,
                "parquet"
            );

            const sql = saveQuerySpy.firstCall.args[1] as string;
            // Both sub-fields are nested under the same list_transform, not two separate columns
            expect(sql).to.include(
                `list_transform("Well", __e -> {'Dose': {'Unit': __e."Dose"."Unit", 'Value': __e."Dose"."Value"}}) AS "Well"`
            );
            // list_transform("Well", ...) appears only once (no duplicate root column)
            expect((sql.match(/list_transform\("Well"/g) || []).length).to.equal(1);
        });

        it("uses partial struct for JSON (not array_to_string) so the output stays nested", async () => {
            class MockJsonManifestService extends DatabaseServiceNoop {
                protected readonly existingDataSources = new Set(["parquet_source"]);
                public saveQuery(
                    _destination?: string,
                    _sql?: string,
                    _format?: string
                ): Promise<Uint8Array> {
                    return Promise.resolve(new Uint8Array());
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }
            const mockDbService = new MockJsonManifestService();
            const saveQuerySpy = sandbox.spy(mockDbService, "saveQuery");
            const databaseFileService = new DatabaseFileService({
                dataSourceNames: ["parquet_source"],
                databaseService: mockDbService,
                downloadService: new FileDownloadServiceNoop(),
            });
            const selections = [
                { indexRanges: [{ start: 0, end: 1 }], filters: [], sort: undefined },
            ];

            await databaseFileService.download(["File Name", "Well.Color"], selections, "json");

            const sql = saveQuerySpy.firstCall.args[1] as string;
            // JSON uses the same partial-struct path as parquet — NOT array_to_string
            expect(sql).to.include(
                `list_transform("Well", __e -> {'Color': __e."Color"}) AS "Well"`
            );
            expect(sql).to.not.include("array_to_string");
        });
    });

    describe("getSelectionSql", () => {
        it("selects the requested annotations from the given data sources", () => {
            const sql = DatabaseFileService.getSelectionSql(
                ["File Name", "Cell Line"],
                [{ indexRanges: [{ start: 0, end: 2 }], filters: [], sort: undefined }],
                "csv",
                ["my_source"],
                new Map()
            );
            expect(sql).to.include('SELECT "File Name", "Cell Line"');
            expect(sql).to.include('"my_source"');
        });

        it("uses hidden_bff_uid IN (subquery) to scope rows to the selection", () => {
            const sql = DatabaseFileService.getSelectionSql(
                ["File ID"],
                [{ indexRanges: [{ start: 5, end: 7 }], filters: [], sort: undefined }],
                "csv",
                ["my_source"],
                new Map()
            );
            expect(sql).to.match(/hidden_bff_uid\s+IN\s*\(/i);
            expect(sql).to.include("LIMIT 3");
            expect(sql).to.include("OFFSET 5");
        });

        it("ORs together multiple index ranges from one selection", () => {
            const sql = DatabaseFileService.getSelectionSql(
                ["File ID"],
                [
                    {
                        indexRanges: [
                            { start: 0, end: 0 },
                            { start: 4, end: 4 },
                        ],
                        filters: [],
                        sort: undefined,
                    },
                ],
                "csv",
                ["my_source"],
                new Map()
            );
            // Two separate subqueries joined with OR
            expect((sql.match(/hidden_bff_uid\s+IN\s*\(/gi) || []).length).to.equal(2);
            expect(sql).to.include(" OR ");
        });

        it("ORs together index ranges across multiple selections", () => {
            const sql = DatabaseFileService.getSelectionSql(
                ["File ID"],
                [
                    {
                        indexRanges: [{ start: 0, end: 1 }],
                        filters: [],
                        sort: undefined,
                    },
                    {
                        indexRanges: [{ start: 10, end: 12 }],
                        filters: [],
                        sort: undefined,
                    },
                ],
                "csv",
                ["my_source"],
                new Map()
            );
            expect((sql.match(/hidden_bff_uid\s+IN\s*\(/gi) || []).length).to.equal(2);
            expect(sql).to.include(" OR ");
        });

        it("includes filter WHERE clauses inside each subquery", () => {
            const sql = DatabaseFileService.getSelectionSql(
                ["File ID"],
                [
                    {
                        indexRanges: [{ start: 0, end: 1 }],
                        filters: [new FileFilter("Color", "Orange")],
                        sort: undefined,
                    },
                ],
                "csv",
                ["my_source"],
                new Map()
            );
            expect(sql).to.include("Color");
            expect(sql).to.include("Orange");
        });
    });
});
