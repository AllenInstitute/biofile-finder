import * as duckdb from "@duckdb/duckdb-wasm";
import axios from "axios";
import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";

import DatabaseServiceNoop from "../DatabaseServiceNoop";
import { HIDDEN_UID_ANNOTATION } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import DataSourcePreparationError from "../../../errors/DataSourcePreparationError";

import DatabaseService, { getParquetFileNameSelectPart } from "..";

describe("DatabaseService", () => {
    describe("fetchAnnotations", () => {
        const annotations = ["A", "B", "Cc", "dD"].map((name) => ({
            column_name: name,
            data_type: "VARCHAR",
        }));

        // DatabaseService is abstract so we need a dummy impl to test
        // implemented methods
        class DatabaseServiceDummyImpl extends DatabaseServiceNoop {
            saveQuery(): Promise<Uint8Array> {
                throw new Error("Not implemented in dummy impl");
            }
            execute(): Promise<void> {
                throw new Error("Not implemented in dummy impl");
            }
            addDataSource(): Promise<void> {
                throw new Error("Not implemented in dummy impl");
            }
            query(): { promise: Promise<any> } {
                return { promise: Promise.resolve(annotations) };
            }
        }

        it("issues request for all available Annotations", async () => {
            const service = new DatabaseServiceDummyImpl();
            const actualAnnotations = await service.fetchAnnotations(["foo"]);
            expect(actualAnnotations.length).to.equal(4);
        });
    });

    describe("addDataSource", () => {
        const mockAnnotations = [
            new Annotation({
                annotationDisplayName: AnnotationName.KIND,
                annotationName: AnnotationName.KIND,
                description: "",
                type: AnnotationType.STRING,
                annotationId: 0,
            }),
            new Annotation({
                annotationDisplayName: "Cell Line",
                annotationName: "Cell Line",
                description: "",
                type: AnnotationType.STRING,
                annotationId: 1,
            }),
        ];
        class MockDatabaseService extends DatabaseService {
            async initialize(): Promise<void> {
                // Node does not provide Workers, so need a mock initialization that skips them
                const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.INFO);
                this.database = new duckdb.AsyncDuckDB(logger, null);
                return Promise.resolve();
            }
            addDataSource(): Promise<void> {
                return Promise.resolve();
            }
            execute(): Promise<void> {
                return Promise.resolve();
            }
            query(): { promise: Promise<any> } {
                return { promise: Promise.resolve([]) };
            }
        }
        const service = new MockDatabaseService();
        const tempDir = path.join(os.tmpdir(), "DatabaseServiceTest");

        before(async () => {
            await fs.promises.mkdir(tempDir);
            await service.initialize();
        });

        beforeEach(() => {
            sinon.stub(axios, "get").returns(Promise.resolve());
        });

        afterEach(() => {
            sinon.restore();
        });

        after(async () => {
            await fs.promises.rm(tempDir, { recursive: true });
            service.close();
        });

        ["csv", "json", "parquet"].forEach((type: any) => {
            it(`creates table from file of type ${type}`, async () => {
                // Arrange
                const tempFileName = `test.${type}`;
                const tempFile = path.resolve(tempDir, tempFileName);
                await fs.promises.writeFile(tempFile, "a,b,c\n1,2,3\n4,5,6\n");
                // Act
                // Skip normalization
                await service.prepareDataSources([{ name: tempFileName, uri: tempFile }], true);
                // Assert
                expect(service.hasDataSource(tempFileName)).to.be.true;
            });
        });

        it("throws error when missing File Path column", async () => {
            // Arrange
            sinon.stub(service, "fetchAnnotations").returns(Promise.resolve(mockAnnotations));
            const tempFileName = "testFailure.csv";
            const tempFile = path.resolve(tempDir, tempFileName);
            await fs.promises.writeFile(tempFile, "a,b,c\n1,2,3\n4,5,6\n");
            let caughtError;

            // Act
            try {
                await service.prepareDataSources([{ name: tempFileName, uri: tempFile }]);
            } catch (error) {
                caughtError = error;
            }

            // Assert
            expect(caughtError).to.not.be.undefined;
            expect(caughtError).to.contain(/DataSourcePreparationError/);
            expect(caughtError).to.contain(/File Path/);
            expect(service.hasDataSource(tempFileName)).to.be.false;
        });

        it("successfully adds source when has File Path column", async () => {
            // Arrange
            const filePathAnnotation = new Annotation({
                annotationDisplayName: AnnotationName.FILE_PATH,
                annotationName: "File Path",
                description: "",
                type: AnnotationType.STRING,
                annotationId: 3,
            });
            sinon
                .stub(service, "fetchAnnotations")
                .returns(Promise.resolve([...mockAnnotations, filePathAnnotation]));
            const tempFileName = "testSuccess.csv";
            const tempFile = path.resolve(tempDir, tempFileName);
            await fs.promises.writeFile(tempFile, "a,b,c,path\n1,2,3,path\n4,5,6,path\n");
            let caughtError;

            // Act
            try {
                await service.prepareDataSources([{ name: tempFileName, uri: tempFile }]);
            } catch (error) {
                caughtError = error;
            }

            // Assert
            expect(caughtError).to.be.undefined;
            expect(service.hasDataSource(tempFileName)).to.be.true;
        });

        it("throws error when a column name contains double quotes", async () => {
            // Arrange
            const badColumnName = '"Bad" column name';
            const doubleQuoteAnnotation = new Annotation({
                annotationDisplayName: badColumnName,
                annotationName: badColumnName,
                description: "",
                type: AnnotationType.STRING,
                annotationId: 3,
            });
            sinon
                .stub(service, "fetchAnnotations")
                .returns(Promise.resolve([...mockAnnotations, doubleQuoteAnnotation]));
            const tempFileName = "testFailure.csv";
            const tempFile = path.resolve(tempDir, tempFileName);
            await fs.promises.writeFile(tempFile, "a,b,c,d\n1,2,3,4\n5,6,7,8\n");
            let caughtError;

            // Act
            try {
                await service.prepareDataSources([{ name: tempFileName, uri: tempFile }]);
            } catch (error) {
                caughtError = error;
            }

            // Assert
            expect(caughtError).to.not.be.undefined;
            expect(caughtError).to.contain(/DataSourcePreparationError/);
            expect((caughtError as Error)?.message).to.contain(badColumnName);
            expect(service.hasDataSource(tempFileName)).to.be.false;
        });

        describe("CORS error handling for URL data sources", () => {
            // A service where addDataSource always fails (simulates DuckDB failing to load a URL)
            class MockDatabaseServiceWithURLFailure extends MockDatabaseService {
                addDataSource(): Promise<void> {
                    return Promise.reject(new Error("DuckDB: HTTP 0"));
                }
            }
            const failingService = new MockDatabaseServiceWithURLFailure();

            before(async () => {
                await failingService.initialize();
            });

            after(() => {
                failingService.close();
            });

            it("provides a CORS-specific error message when no HTTP response is received", async () => {
                // Arrange: reset the beforeEach stub and use a CORS/network error instead
                sinon.restore();
                const corsError = Object.assign(new Error("Network Error"), {
                    isAxiosError: true,
                    request: {}, // a request was made but no response was received
                    // response is intentionally absent to simulate CORS
                });
                sinon.stub(axios, "get").rejects(corsError);

                let caughtError;
                try {
                    await failingService.prepareDataSources([
                        { name: "cors-test", uri: "https://example.com/data.csv" },
                    ]);
                } catch (error) {
                    caughtError = error;
                }

                // Assert
                expect(caughtError).to.not.be.undefined;
                expect((caughtError as Error).message).to.include("CORS");
            });

            it("uses HTTP response error details when a response with an error status is received", async () => {
                // Arrange: reset the beforeEach stub and simulate a proper HTTP error response
                sinon.restore();
                const httpError = Object.assign(new Error("Request Failed with status 403"), {
                    isAxiosError: true,
                    response: {
                        status: 403,
                        statusText: "Forbidden",
                        data: { error: "Access denied" },
                    },
                });
                sinon.stub(axios, "get").rejects(httpError);

                let caughtError;
                try {
                    await failingService.prepareDataSources([
                        {
                            name: "http-error-test",
                            uri: "https://example.com/data.csv",
                        },
                    ]);
                } catch (error) {
                    caughtError = error;
                }

                // Assert: should show the HTTP error details, not a CORS message
                expect(caughtError).to.not.be.undefined;
                expect((caughtError as Error).message).to.include("403");
                expect((caughtError as Error).message).to.not.include("CORS");
            });
        });
    });

    describe("prepareDataSources parquet aggregation", () => {
        class MockAggregateParquetDatabaseService extends DatabaseService {
            public executedSQL: string[] = [];

            constructor(private readonly parquetColumnsBySource: Record<string, string[]>) {
                super();
                Object.keys(parquetColumnsBySource).forEach((sourceName) =>
                    this.existingDataSources.add(sourceName)
                );
            }

            protected addDataSource(): Promise<void> {
                return Promise.resolve();
            }

            public execute(sql: string): Promise<void> {
                this.executedSQL.push(sql);
                return Promise.resolve();
            }

            public query(sql: string): { promise: Promise<any> } {
                const parquetDescribeMatch = sql.match(
                    /DESCRIBE SELECT \* FROM parquet_scan\(\s*ARRAY\[([\s\S]*?)\]/
                );
                if (parquetDescribeMatch) {
                    // Recover the source name from each file handle. A Delta source
                    // registers many handles, all prefixed with its source name.
                    const columns = new Set<string>();
                    for (const match of parquetDescribeMatch[1].matchAll(/'([^']+)'/g)) {
                        const sourceName = match[1].split("-bff-filehandle")[0];
                        (this.parquetColumnsBySource[sourceName] || []).forEach((column) =>
                            columns.add(column)
                        );
                    }
                    return {
                        promise: Promise.resolve(
                            [...columns].map((column_name) => ({ column_name }))
                        ),
                    };
                }
                return { promise: Promise.resolve([]) };
            }
        }

        it("aggregates multiple parquet sources and records aggregate source", async () => {
            const service = new MockAggregateParquetDatabaseService({
                "a.parquet": ["file_path"],
                "b.parquet": ["File Size"],
            });

            await service.prepareDataSources([
                { name: "a.parquet", uri: "https://example.com/a.parquet" },
                { name: "b.parquet", uri: "https://example.com/b.parquet" },
            ]);

            expect(service.hasAggregateSource(["a.parquet", "b.parquet"])).to.be.true;
        });

        it("rejects aggregation when parquet and non-parquet sources are mixed", async () => {
            const service = new MockAggregateParquetDatabaseService({
                "a.parquet": ["file_path"],
                "b.csv": ["File Path"],
            });

            let caughtError;
            try {
                await service.prepareDataSources([
                    { name: "a.parquet", uri: "https://example.com/a.parquet" },
                    { name: "b.csv", uri: "https://example.com/b.csv" },
                ]);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.be.instanceOf(DataSourcePreparationError);
            expect((caughtError as Error).message).to.include(
                "Parquet tables cannot be aggregated with non-parquet tables."
            );
        });

        it("uses suffixed file handle names in parquet_scan to avoid prefix collisions", async () => {
            // Regression: if "foo" and "foo2" are registered as-is, DuckDB
            // prefix-matches "foo" against "foo2" (duckdb-wasm#2227).
            // This test only verifies the suffix is applied in the generated SQL;
            // actual collision prevention is a DuckDB-wasm integration concern.
            const service = new MockAggregateParquetDatabaseService({
                foo: ["file_path"],
                foo2: ["file_path"],
            });

            await service.prepareDataSources([
                { name: "foo", uri: "https://example.com/foo.parquet" },
                { name: "foo2", uri: "https://example.com/foo2.parquet" },
            ]);

            const createViewSql = service.executedSQL.find((sql) => sql.includes("CREATE VIEW"));
            expect(createViewSql).to.not.be.undefined;
            expect(createViewSql).to.match(/parquet_scan\(\s*ARRAY\[/);
            expect(createViewSql).to.include("'foo-bff-filehandle'");
            expect(createViewSql).to.include("'foo2-bff-filehandle'");
        });

        it("qualifies the hidden UID by filename so it stays unique across files", async () => {
            const service = new MockAggregateParquetDatabaseService({
                "a.parquet": ["File Path"],
                "b.parquet": ["File Path"],
            });

            await service.prepareDataSources([
                { name: "a.parquet", uri: "https://example.com/a.parquet" },
                { name: "b.parquet", uri: "https://example.com/b.parquet" },
            ]);

            const createViewSql = service.executedSQL.find((sql) => sql.includes("CREATE VIEW"));
            expect(createViewSql).to.include(
                `("bff_source_file" || '#' || CAST("file_row_number" AS VARCHAR)) ` +
                    `AS "${HIDDEN_UID_ANNOTATION}"`
            );
        });

        it("does not collide with a source column named filename", async () => {
            const service = new MockAggregateParquetDatabaseService({
                "a.parquet": ["File Path", "filename"],
                "b.parquet": ["File Path", "filename"],
            });

            await service.prepareDataSources([
                { name: "a.parquet", uri: "https://example.com/a.parquet" },
                { name: "b.parquet", uri: "https://example.com/b.parquet" },
            ]);

            const createViewSql = service.executedSQL.find((sql) => sql.includes("CREATE VIEW"));
            // The user's own column is still projected untouched...
            expect(createViewSql).to.include(`"filename"`);
            // ...while the injected one is asked for under a name of ours, and
            // that is what the uid and "Data source" are built from.
            expect(createViewSql).to.include(`filename = 'bff_source_file'`);
            expect(createViewSql).to.include(`"bff_source_file" || '#'`);
        });

        it("creates aggregate parquet view using union_by_name and data source projection", async () => {
            const service = new MockAggregateParquetDatabaseService({
                "a.parquet": ["file_path"],
                "b.parquet": ["File Size"],
            });

            await service.prepareDataSources([
                { name: "a.parquet", uri: "https://example.com/a.parquet" },
                { name: "b.parquet", uri: "https://example.com/b.parquet" },
            ]);

            const createViewSql = service.executedSQL.find((sql) => sql.includes("CREATE VIEW"));
            expect(createViewSql).to.not.be.undefined;
            expect(createViewSql).to.match(/parquet_scan\(\s*ARRAY\[/);
            expect(createViewSql).to.include("union_by_name = true");
            expect(createViewSql).to.include(
                `REGEXP_REPLACE("bff_source_file", '-bff-filehandle.*$', '') AS "Data source"`
            );
        });

        describe("delta lake sources", () => {
            const DELTA_SOURCE = "table";

            class MockDeltaDatabaseService extends DatabaseService {
                public executedSQL: string[] = [];
                public deltaProbeCount = 0;
                public isDelta = true;

                constructor(
                    private readonly parquetColumnsBySource: Record<string, string[]>,
                    dataFiles: string[]
                ) {
                    const deltaLakeService = {
                        listDataFiles: () => Promise.resolve(dataFiles),
                        isDeltaTable: () => {
                            this.deltaProbeCount += 1;
                            return Promise.resolve(this.isDelta);
                        },
                    } as any;
                    super(deltaLakeService);
                    // The delta source must go through addDataSource for its data
                    // files to be registered, so leave it out of the pre-registered set.
                    Object.keys(parquetColumnsBySource)
                        .filter((sourceName) => sourceName !== DELTA_SOURCE)
                        .forEach((sourceName) => this.existingDataSources.add(sourceName));
                }

                public execute(sql: string): Promise<void> {
                    this.executedSQL.push(sql);
                    return Promise.resolve();
                }

                // Delta sources go through the real addDataSource, so stub out the
                // pieces that need the network and a live database.
                public registeredURLs: { handle: string; url: string }[] = [];

                protected addDataSource(
                    name: string,
                    type: string,
                    uri: string | File
                ): Promise<void> {
                    if (type === "delta") {
                        return super.addDataSource(name, type as any, uri);
                    }
                    return Promise.resolve();
                }

                protected async registerFileURLs(handles: string[], urls: string[]): Promise<void> {
                    handles.forEach((handle, index) =>
                        this.registeredURLs.push({ handle, url: urls[index] })
                    );
                }

                public query(sql: string): { promise: Promise<any> } {
                    const parquetDescribeMatch = sql.match(
                        /DESCRIBE SELECT \* FROM parquet_scan\(\s*ARRAY\[([\s\S]*?)\]/
                    );
                    if (parquetDescribeMatch) {
                        // Recover the source name from each file handle. A Delta source
                        // registers many handles, all prefixed with its source name.
                        const columns = new Set<string>();
                        for (const match of parquetDescribeMatch[1].matchAll(/'([^']+)'/g)) {
                            const sourceName = match[1].split("-bff-filehandle")[0];
                            (this.parquetColumnsBySource[sourceName] || []).forEach((column) =>
                                columns.add(column)
                            );
                        }
                        return {
                            promise: Promise.resolve(
                                [...columns].map((column_name) => ({ column_name }))
                            ),
                        };
                    }
                    return { promise: Promise.resolve([]) };
                }
            }

            const DATA_FILES = [
                "https://example.com/table/part-00000.snappy.parquet",
                "https://example.com/table/part-00001.snappy.parquet",
            ];

            it("identifies an untyped URL as delta by probing for _delta_log", async () => {
                // getNameAndTypeFromSourceUrl leaves type undefined for a URL with
                // no recognized extension; this is where that gets settled.
                const service = new MockDeltaDatabaseService({ table: ["File Path"] }, DATA_FILES);

                await service.prepareDataSources(
                    [{ name: "table", uri: "s3://bucket/table" }],
                    true
                );

                expect(service.hasDataSource("table")).to.be.true;
                expect(service.registeredURLs).to.have.lengthOf(2);
            });

            it("falls back to csv for an untyped URL that is not a delta table", async () => {
                const service = new MockDeltaDatabaseService({ table: ["File Path"] }, DATA_FILES);
                service.isDelta = false;

                await service.prepareDataSources(
                    [{ name: "table", uri: "s3://bucket/table" }],
                    true
                );

                expect(service.hasDataSource("table")).to.be.true;
                expect(service.registeredURLs).to.be.empty;
            });

            it("does not probe a URL whose extension already identified it", async () => {
                const service = new MockDeltaDatabaseService(
                    { "a.parquet": ["File Path"] },
                    DATA_FILES
                );

                await service.prepareDataSources(
                    [{ name: "a.parquet", uri: "https://example.com/a.parquet" }],
                    true
                );

                expect(service.deltaProbeCount).to.equal(0);
            });

            it("probes a given URL only once", async () => {
                const service = new MockDeltaDatabaseService({ table: ["File Path"] }, DATA_FILES);

                await service.prepareDataSources(
                    [{ name: "table", uri: "s3://bucket/table" }],
                    true
                );
                await service.prepareDataSources(
                    [{ name: "table", uri: "s3://bucket/table" }],
                    true
                );

                expect(service.deltaProbeCount).to.equal(1);
            });

            it("registers one file handle per parquet data file", async () => {
                const service = new MockDeltaDatabaseService({ table: ["File Path"] }, DATA_FILES);

                // Skip normalization: these assert on registration and SQL shape,
                // not on data source validation.
                await service.prepareDataSources(
                    [{ name: "table", uri: "s3://bucket/table" }],
                    true
                );

                expect(service.registeredURLs).to.deep.equal([
                    { handle: "table-bff-filehandle-00000000.parquet", url: DATA_FILES[0] },
                    { handle: "table-bff-filehandle-00000001.parquet", url: DATA_FILES[1] },
                ]);
            });

            it("scans every data file from a single view", async () => {
                const service = new MockDeltaDatabaseService({ table: ["File Path"] }, DATA_FILES);

                // Skip normalization: these assert on registration and SQL shape,
                // not on data source validation.
                await service.prepareDataSources(
                    [{ name: "table", uri: "s3://bucket/table" }],
                    true
                );

                const createViewSql = service.executedSQL.find((sql) =>
                    sql.includes("CREATE VIEW")
                );
                expect(createViewSql).to.include(`CREATE VIEW "table"`);
                expect(createViewSql).to.include(`'table-bff-filehandle-00000000.parquet'`);
                expect(createViewSql).to.include(`'table-bff-filehandle-00000001.parquet'`);
                expect(createViewSql).to.include("union_by_name = true");
            });

            it('shows one "Data source" per logical source, not per data file', async () => {
                const service = new MockDeltaDatabaseService(
                    { table: ["File Path"], "a.parquet": ["File Path"] },
                    DATA_FILES
                );

                await service.prepareDataSources(
                    [
                        { name: "table", uri: "s3://bucket/table" },
                        {
                            name: "a.parquet",
                            uri: "https://example.com/a.parquet",
                        },
                    ],
                    true
                );

                const createViewSql = service.executedSQL.find((sql) =>
                    sql.includes(`CREATE VIEW "a.parquet, table"`)
                );
                expect(createViewSql).to.include(
                    `REGEXP_REPLACE("bff_source_file", '-bff-filehandle.*$', '') AS "Data source"`
                );
            });

            it("aggregates with plain parquet sources rather than rejecting them", async () => {
                const service = new MockDeltaDatabaseService(
                    { table: ["File Path"], "a.parquet": ["File Path"] },
                    DATA_FILES
                );

                await service.prepareDataSources(
                    [
                        { name: "table", uri: "s3://bucket/table" },
                        {
                            name: "a.parquet",
                            uri: "https://example.com/a.parquet",
                        },
                    ],
                    true
                );

                expect(service.hasAggregateSource(["table", "a.parquet"])).to.be.true;
            });

            it("never treats an uploaded local file as a Delta table", async () => {
                // A Delta table is a directory, which the browser cannot hand us
                // as a File, so there is nothing to probe.
                const service = new MockDeltaDatabaseService({ table: ["File Path"] }, DATA_FILES);

                await service.prepareDataSources(
                    [{ name: "table", uri: new File([""], "table") }],
                    true
                );

                expect(service.hasDataSource("table")).to.be.true;
                expect(service.deltaProbeCount).to.equal(0);
                expect(service.registeredURLs).to.be.empty;
            });
        });
    });

    describe("columnTypeToAnnotationType", () => {
        class ExposedDatabaseService extends DatabaseServiceNoop {
            static exposeColumnType(t: string) {
                return DatabaseService.columnTypeToAnnotationType(t);
            }
        }
        const map = ExposedDatabaseService.exposeColumnType.bind(ExposedDatabaseService);

        // NUMBER types — integers
        it("maps INTEGER to NUMBER", () => expect(map("INTEGER")).to.equal(AnnotationType.NUMBER));
        it("maps BIGINT to NUMBER", () => expect(map("BIGINT")).to.equal(AnnotationType.NUMBER));
        it("maps HUGEINT to NUMBER", () => expect(map("HUGEINT")).to.equal(AnnotationType.NUMBER));
        it("maps SMALLINT to NUMBER", () =>
            expect(map("SMALLINT")).to.equal(AnnotationType.NUMBER));
        it("maps TINYINT to NUMBER", () => expect(map("TINYINT")).to.equal(AnnotationType.NUMBER));
        it("maps UBIGINT to NUMBER", () => expect(map("UBIGINT")).to.equal(AnnotationType.NUMBER));
        it("maps UINTEGER to NUMBER", () =>
            expect(map("UINTEGER")).to.equal(AnnotationType.NUMBER));
        it("maps USMALLINT to NUMBER", () =>
            expect(map("USMALLINT")).to.equal(AnnotationType.NUMBER));
        it("maps UTINYINT to NUMBER", () =>
            expect(map("UTINYINT")).to.equal(AnnotationType.NUMBER));

        // NUMBER types — floats
        it("maps FLOAT to NUMBER", () => expect(map("FLOAT")).to.equal(AnnotationType.NUMBER));
        it("maps DOUBLE to NUMBER", () => expect(map("DOUBLE")).to.equal(AnnotationType.NUMBER));
        it("maps REAL to NUMBER", () => expect(map("REAL")).to.equal(AnnotationType.NUMBER));
        it("maps DECIMAL(18,3) to NUMBER", () =>
            expect(map("DECIMAL(18,3)")).to.equal(AnnotationType.NUMBER));

        // BOOLEAN
        it("maps BOOLEAN to BOOLEAN", () =>
            expect(map("BOOLEAN")).to.equal(AnnotationType.BOOLEAN));

        // DURATION
        it("maps INTERVAL to DURATION", () =>
            expect(map("INTERVAL")).to.equal(AnnotationType.DURATION));

        // DATE / DATETIME
        it("maps DATE to DATE", () => expect(map("DATE")).to.equal(AnnotationType.DATE));
        it("maps TIMESTAMP to DATETIME", () =>
            expect(map("TIMESTAMP")).to.equal(AnnotationType.DATETIME));
        it("maps TIMESTAMPTZ to DATETIME", () =>
            expect(map("TIMESTAMPTZ")).to.equal(AnnotationType.DATETIME));
        it("maps TIMESTAMP WITH TIME ZONE to DATETIME", () =>
            expect(map("TIMESTAMP WITH TIME ZONE")).to.equal(AnnotationType.DATETIME));

        // STRING fallback
        it("maps VARCHAR to STRING", () => expect(map("VARCHAR")).to.equal(AnnotationType.STRING));
        it("maps TEXT to STRING", () => expect(map("TEXT")).to.equal(AnnotationType.STRING));
        it("maps unknown types to STRING", () =>
            expect(map("SOMEUNKNOWNTYPE")).to.equal(AnnotationType.STRING));
    });

    describe("parseStructFields", () => {
        it("returns top-level scalar fields with a single false flag", () => {
            expect(
                DatabaseService.parseStructFields("STRUCT(Gene VARCHAR, Score DOUBLE)")
            ).to.deep.equal([
                { name: "Gene", type: "VARCHAR", isArray: [false] },
                { name: "Score", type: "DOUBLE", isArray: [false] },
            ]);
        });

        // Mixed leaf + nested STRUCT[] — the canonical example from the docstring.
        it("flattens nested STRUCT[] fields with dotted names and per-segment flags", () => {
            expect(
                DatabaseService.parseStructFields(
                    "STRUCT(Gene VARCHAR, Dose STRUCT(Unit VARCHAR, Value DOUBLE)[])[]"
                )
            ).to.deep.equal([
                { name: "Gene", type: "VARCHAR", isArray: [false] },
                { name: "Dose.Unit", type: "VARCHAR", isArray: [true, false] },
                { name: "Dose.Value", type: "DOUBLE", isArray: [true, false] },
            ]);
        });

        it("marks a scalar intermediate struct with a false flag", () => {
            expect(
                DatabaseService.parseStructFields("STRUCT(Dose STRUCT(Unit VARCHAR))")
            ).to.deep.equal([{ name: "Dose.Unit", type: "VARCHAR", isArray: [false, false] }]);
        });

        it("flags a list-typed leaf field as array", () => {
            expect(
                DatabaseService.parseStructFields(
                    "STRUCT(Tags VARCHAR[], Dose STRUCT(Names VARCHAR[])[])[]"
                )
            ).to.deep.equal([
                { name: "Tags", type: "VARCHAR[]", isArray: [true] },
                { name: "Dose.Names", type: "VARCHAR[]", isArray: [true, true] },
            ]);
        });

        // Each array boundary contributes one flag in order, deepest path supported.
        it("accumulates an array flag per segment for deeply nested STRUCT[]", () => {
            expect(
                DatabaseService.parseStructFields(
                    "STRUCT(Dose STRUCT(Solution STRUCT(Name VARCHAR)[])[])[]"
                )
            ).to.deep.equal([
                { name: "Dose.Solution.Name", type: "VARCHAR", isArray: [true, true, false] },
            ]);
        });

        it("returns an empty array for a non-STRUCT type", () => {
            expect(DatabaseService.parseStructFields("VARCHAR")).to.deep.equal([]);
        });
    });

    describe("getParquetFileNameSelectPart", () => {
        it("returns File Name SELECT expression when File Path exists and File Name does not", () => {
            // Arrange
            const actualToPreDefined = new Map([["file_path", "File Path"]]);

            // Act
            const result = getParquetFileNameSelectPart(actualToPreDefined);

            // Assert
            expect(result).to.not.be.null;
            expect(result).to.include("File Name");
            expect(result).to.include("file_path");
            expect(result).to.include("REGEXP_REPLACE");
        });

        it("returns null when File Name column already exists", () => {
            // Arrange
            const actualToPreDefined = new Map([
                ["file_path", "File Path"],
                ["file_name", "File Name"],
            ]);

            // Act
            const result = getParquetFileNameSelectPart(actualToPreDefined);

            // Assert
            expect(result).to.be.null;
        });

        it("returns null when File Path column does not exist", () => {
            // Arrange
            const actualToPreDefined = new Map();

            // Act
            const result = getParquetFileNameSelectPart(actualToPreDefined);

            // Assert
            expect(result).to.be.null;
        });
    });

    describe("processProvenance", () => {
        function createMockService(rows: Record<string, unknown>[]): DatabaseService {
            class MockProvenanceDatabaseService extends DatabaseServiceNoop {
                sourceProvenanceName = "prov-source";
                query(): { promise: Promise<any> } {
                    return { promise: Promise.resolve(rows) };
                }
                deleteSourceProvenance(): Promise<void> {
                    return Promise.resolve();
                }
                addDataSource(): Promise<void> {
                    return Promise.resolve();
                }
            }
            return new MockProvenanceDatabaseService();
        }

        const provenanceSource = { name: "prov-source", type: "csv" as const, uri: "prov.csv" };

        it("emits a warning and filters out each malformed row while keeping valid ones", async () => {
            // Arrange
            const rows = [
                // Valid row - should be kept
                {
                    parent: "A",
                    "paren ttype": "file",
                    child: "B",
                    childtype: "file",
                    relationship: "derived_from",
                },
                // Missing required "relationship" - should warn + drop
                { parent: "A", parenttype: "file", child: "C", childtype: "file" },
                // Invalid "parenttype" - should warn + drop
                {
                    parent: "A",
                    parenttype: "banana",
                    child: "D",
                    childtype: "file",
                    relationship: "derived_from",
                },
                // Invalid "relationshiptype" - should warn + drop
                {
                    parent: "A",
                    parenttype: "file",
                    child: "E",
                    childtype: "file",
                    relationship: "derived_from",
                    relationshiptype: "not-a-real-type",
                },
            ];
            const service = createMockService(rows);

            // Act
            const { edgeDefinitions, warnings } = await service.processProvenance(provenanceSource);

            // Assert
            expect(edgeDefinitions).to.have.lengthOf(1);
            expect(edgeDefinitions[0]).to.deep.equal({
                parent: { name: "A", type: "file" },
                child: { name: "B", type: "file" },
                relationship: "derived_from",
                relationshipType: undefined,
            });
            expect(warnings).to.have.lengthOf(3);
            expect(warnings.some((w) => w.includes("relationship"))).to.be.true;
            expect(warnings.some((w) => w.includes("parenttype"))).to.be.true;
            expect(warnings.some((w) => w.includes("Relationship Type"))).to.be.true;
        });

        it("emits a warning and drops duplicate parent/child combinations", async () => {
            // Arrange
            const duplicatedRow = {
                parent: "A",
                parenttype: "file",
                child: "B",
                childtype: "file",
                relationship: "derived_from",
            };
            const service = createMockService([duplicatedRow, { ...duplicatedRow }]);

            // Act
            const { edgeDefinitions, warnings } = await service.processProvenance(provenanceSource);

            // Assert
            expect(edgeDefinitions).to.have.lengthOf(1);
            expect(warnings).to.have.lengthOf(1);
            expect(warnings[0]).to.include("duplicate");
        });
    });
});
