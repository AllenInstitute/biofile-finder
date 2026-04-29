import * as duckdb from "@duckdb/duckdb-wasm";
import axios from "axios";
import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";

import DatabaseServiceNoop from "../DatabaseServiceNoop";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import DataSourcePreparationError from "../../../errors/DataSourcePreparationError";

import DatabaseService, { getParquetFileNameSelectPart } from "..";

describe("DatabaseService", () => {
    describe("fetchAnnotations", () => {
        const annotations = ["A", "B", "Cc", "dD"].map((name) => ({
            name,
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
                await service.prepareDataSources(
                    [{ name: tempFileName, type, uri: tempFile }],
                    true
                );
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
                await service.prepareDataSources([
                    { name: tempFileName, type: "csv", uri: tempFile },
                ]);
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
                await service.prepareDataSources([
                    { name: tempFileName, type: "csv", uri: tempFile },
                ]);
            } catch (error) {
                caughtError = error;
            }

            // Assert
            expect(caughtError).to.be.undefined;
            expect(service.hasDataSource(tempFileName)).to.be.true;
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

            public query(sql: string): { promise: Promise<{ [key: string]: any }[]> } {
                const parquetDescribeMatch = sql.match(
                    /DESCRIBE SELECT \* FROM parquet_scan\("(.+)"\)/
                );
                if (parquetDescribeMatch) {
                    const sourceName = parquetDescribeMatch[1];
                    const columns = this.parquetColumnsBySource[sourceName] || [];
                    return {
                        promise: Promise.resolve(columns.map((column_name) => ({ column_name }))),
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
                { name: "a.parquet", type: "parquet", uri: "https://example.com/a.parquet" },
                { name: "b.parquet", type: "parquet", uri: "https://example.com/b.parquet" },
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
                    { name: "a.parquet", type: "parquet", uri: "https://example.com/a.parquet" },
                    { name: "b.csv", type: "csv", uri: "https://example.com/b.csv" },
                ]);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.be.instanceOf(DataSourcePreparationError);
            expect((caughtError as Error).message).to.include(
                "Parquet tables cannot be aggregated with non-parquet tables."
            );
        });

        it("creates aggregate parquet view using union_by_name and data source projection", async () => {
            const service = new MockAggregateParquetDatabaseService({
                "a.parquet": ["file_path"],
                "b.parquet": ["File Size"],
            });

            await service.prepareDataSources([
                { name: "a.parquet", type: "parquet", uri: "https://example.com/a.parquet" },
                { name: "b.parquet", type: "parquet", uri: "https://example.com/b.parquet" },
            ]);

            const createViewSql = service.executedSQL.find((sql) => sql.includes("CREATE VIEW"));
            expect(createViewSql).to.not.be.undefined;
            expect(createViewSql).to.include("parquet_scan(ARRAY[");
            expect(createViewSql).to.include("union_by_name = true");
            expect(createViewSql).to.include(`"filename" AS "Data source"`);
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
});
