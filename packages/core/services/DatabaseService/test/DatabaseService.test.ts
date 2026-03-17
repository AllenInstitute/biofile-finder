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
            sinon.stub(axios, "get").returns(Promise.resolve());
            await fs.promises.mkdir(tempDir);
            await service.initialize();
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
