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
    });

    describe("download", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("saves query output and forwards it to download service when file system is inaccessible", async () => {
            const mockBuffer = new Uint8Array([10, 20, 30]);

            class MockDatabaseDownloadService extends DatabaseServiceNoop {
                public saveQuery(
                    _destination?: string,
                    _sql?: string,
                    _format?: string
                ): Promise<Uint8Array> {
                    return Promise.resolve(mockBuffer);
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }

            class MockFileDownloadService extends FileDownloadServiceNoop {
                public isFileSystemAccessible = false;
            }

            const databaseService = new MockDatabaseDownloadService();
            const downloadService = new MockFileDownloadService();
            const saveQuerySpy = sandbox.spy(databaseService, "saveQuery");
            const downloadSpy = sandbox.spy(downloadService, "download");
            const defaultDirSpy = sandbox.spy(downloadService, "getDefaultDownloadDirectory");
            sandbox.stub(DatabaseFileService, "getSelectionSql").returns("SELECT 1");

            const fileService = new DatabaseFileService({
                dataSourceNames: ["source_a"],
                databaseService,
                downloadService,
            });

            await fileService.download(
                ["File Name"],
                [{ indexRanges: [{ start: 0, end: 0 }], filters: [], sort: undefined }],
                "csv"
            );

            expect(saveQuerySpy.calledOnce).to.be.true;
            expect(saveQuerySpy.calledWith(match.string, "SELECT 1", "csv")).to.be.true;
            expect(defaultDirSpy.notCalled).to.be.true;
            expect(downloadSpy.calledOnce).to.be.true;

            const [fileInfoArg] = downloadSpy.firstCall.args;
            expect(fileInfoArg.data).to.equal(mockBuffer);
        });

        it("writes to default download directory before download when file system is accessible", async () => {
            const mockBuffer = new Uint8Array([99]);
            const downloadDir = "/tmp/downloads";

            class MockDatabaseDownloadService extends DatabaseServiceNoop {
                public saveQuery(
                    _destination?: string,
                    _sql?: string,
                    _format?: string
                ): Promise<Uint8Array> {
                    return Promise.resolve(mockBuffer);
                }
                public async fetchAnnotations(): Promise<[]> {
                    return [];
                }
            }

            class MockFileDownloadService extends FileDownloadServiceNoop {
                public isFileSystemAccessible = true;
                public getDefaultDownloadDirectory(): Promise<string> {
                    return Promise.resolve(downloadDir);
                }
            }

            const databaseService = new MockDatabaseDownloadService();
            const downloadService = new MockFileDownloadService();
            const saveQuerySpy = sandbox.spy(databaseService, "saveQuery");
            const downloadSpy = sandbox.spy(downloadService, "download");
            const defaultDirSpy = sandbox.spy(downloadService, "getDefaultDownloadDirectory");
            sandbox.stub(DatabaseFileService, "getSelectionSql").returns("SELECT 1");

            const fileService = new DatabaseFileService({
                dataSourceNames: ["source_a"],
                databaseService,
                downloadService,
            });

            await fileService.download(
                ["File Name"],
                [{ indexRanges: [{ start: 0, end: 0 }], filters: [], sort: undefined }],
                "csv"
            );

            expect(defaultDirSpy.calledOnce).to.be.true;
            expect(saveQuerySpy.calledOnce).to.be.true;
            expect(
                saveQuerySpy.calledWith(match(`${downloadDir}/file-selection-`), "SELECT 1", "csv")
            ).to.be.true;
            expect(downloadSpy.calledOnce).to.be.true;

            const [fileInfoArg] = downloadSpy.firstCall.args;
            expect(fileInfoArg.data).to.equal(mockBuffer);
        });
    });

    describe("getSelectionSql", () => {
        it("throws when pathIsArray metadata is missing for nested annotations", () => {
            expect(() =>
                DatabaseFileService.getSelectionSql(
                    ["Well.Color"],
                    [{ indexRanges: [{ start: 0, end: 0 }], filters: [], sort: undefined }],
                    ["parquet_source"],
                    new Map()
                )
            ).to.throw('Cannot generate SQL for nested annotation "Well.Color"');
        });

        it("uses direct struct access for non-array STRUCT nested columns", () => {
            // When Well is a plain STRUCT (not STRUCT[]), list_transform must NOT be used.
            // buildManifestSelectColumns should emit {'Color': "Well"."Color"} AS "Well".
            const pathIsArrayByName = new Map([["Well.Color", [false, false]]]);
            const sql = DatabaseFileService.getSelectionSql(
                ["File Name", "Well.Color"],
                [{ indexRanges: [{ start: 0, end: 1 }], filters: [], sort: undefined }],
                ["parquet_source"],
                pathIsArrayByName
            );
            expect(sql).to.include(`"File Name"`);
            // No list_transform — the root is a plain STRUCT, not a list
            expect(sql).to.not.include("list_transform");
            // Partial struct with direct field access
            expect(sql).to.include(`{'Color': "Well"."Color"} AS "Well"`);
        });

        it("uses direct struct access for deeply nested non-array structs", () => {
            // Well.Dose.Unit where Well and Dose are both plain STRUCTs
            const pathIsArrayByName = new Map([["Well.Dose.Unit", [false, false, false]]]);
            const sql = DatabaseFileService.getSelectionSql(
                ["Well.Dose.Unit"],
                [{ indexRanges: [{ start: 0, end: 0 }], filters: [], sort: undefined }],
                ["parquet_source"],
                pathIsArrayByName
            );
            expect(sql).to.include(`{'Dose': {'Unit': "Well"."Dose"."Unit"}} AS "Well"`);
            expect(sql).to.not.include("list_transform");
        });

        it("selects the requested annotations from the given data sources", () => {
            const sql = DatabaseFileService.getSelectionSql(
                ["File Name", "Cell Line"],
                [{ indexRanges: [{ start: 0, end: 2 }], filters: [], sort: undefined }],
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
                ["my_source"],
                new Map()
            );
            expect(sql).to.include("Color");
            expect(sql).to.include("Orange");
        });
    });
});
