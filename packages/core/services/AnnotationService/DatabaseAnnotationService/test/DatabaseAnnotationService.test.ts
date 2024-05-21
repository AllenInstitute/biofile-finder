import { expect } from "chai";

import Annotation from "../../../../entity/Annotation";
import FileFilter from "../../../../entity/FileFilter";
import DatabaseServiceNoop from "../../../DatabaseService/DatabaseServiceNoop";

import DatabaseAnnotationService from "..";

describe("DatabaseAnnotationService", () => {
    describe("fetchAnnotations", () => {
        const annotations = ["A", "B", "Cc", "dD"].map((name) => ({
            name,
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): Promise<{ [key: string]: string }[]> {
                return Promise.resolve(annotations);
            }
        }
        const databaseService = new MockDatabaseService();

        it("issues request for all available Annotations", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService,
            });
            const actualAnnotations = await annotationService.fetchAnnotations();
            expect(actualAnnotations.length).to.equal(annotations.length);
            expect(actualAnnotations[0]).to.be.instanceOf(Annotation);
        });
    });

    describe("fetchAnnotationValues", () => {
        const annotations = ["A", "B", "Cc", "dD"].map((name, index) => ({
            select_key: name.toLowerCase() + index,
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): Promise<{ [key: string]: string }[]> {
                return Promise.resolve(annotations);
            }
        }
        const databaseService = new MockDatabaseService();

        it("issues request for 'foo' values", async () => {
            const annotation = "foo";

            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService,
            });
            const actualValues = await annotationService.fetchValues(annotation);
            expect(actualValues).to.be.deep.equal(["a0", "b1", "cc2", "dd3"]);
        });
    });

    describe("fetchRootHierarchyValues", () => {
        const annotationNames = ["Cell Line", "Is Split Scene", "Whatever"];
        const annotations = annotationNames.map((name, index) => ({
            foo: name + index,
            column_name: name,
            column_type: "VARCHAR",
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): Promise<{ [key: string]: string }[]> {
                return Promise.resolve(annotations);
            }
        }
        const databaseService = new MockDatabaseService();

        it("issues a request for annotation values for the first level of the annotation hierarchy", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService,
            });
            const values = await annotationService.fetchRootHierarchyValues(["foo"], []);
            expect(values).to.deep.equal(["Cell Line0", "Is Split Scene1", "Whatever2"]);
        });

        it("issues a request for annotation values for the first level of the annotation hierarchy with filters", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService,
            });
            const filter = new FileFilter("bar", "barValue");
            const values = await annotationService.fetchRootHierarchyValues(["foo"], [filter]);
            expect(values).to.deep.equal(["Cell Line0", "Is Split Scene1", "Whatever2"]);
        });
    });

    describe("fetchHierarchyValuesUnderPath", () => {
        const annotations = ["A", "B", "Cc", "dD"].map((name, index) => ({
            foo: name + index,
            bar: name + index,
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): Promise<{ [key: string]: string }[]> {
                return Promise.resolve(annotations);
            }
        }
        const databaseService = new MockDatabaseService();

        it("issues request for hierarchy values under a specific path within the hierarchy", async () => {
            const expectedValues = ["A0", "B1", "Cc2", "dD3"];

            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService,
            });
            const values = await annotationService.fetchHierarchyValuesUnderPath(
                ["foo", "bar"],
                ["baz"],
                []
            );
            expect(values).to.deep.equal(expectedValues);
        });

        it("issues request for hierarchy values under a specific path within the hierarchy with filters", async () => {
            const expectedValues = ["A0", "B1", "Cc2", "dD3"];

            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService,
            });
            const filter = new FileFilter("bar", "barValue");
            const values = await annotationService.fetchHierarchyValuesUnderPath(
                ["foo", "bar"],
                ["baz"],
                [filter]
            );
            expect(values).to.deep.equal(expectedValues);
        });
    });

    describe("fetchAvailableAnnotationsForHierarchy", () => {
        const annotationNames = ["Cell Line", "Is Split Scene", "Whatever"];
        const annotations = annotationNames.map((name) => ({
            column_name: name,
            column_type: "VARCHAR",
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): Promise<{ [key: string]: string }[]> {
                return Promise.resolve(annotations);
            }
        }
        const databaseService = new MockDatabaseService();

        it("issues request for annotations that can be combined with current hierarchy", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService,
            });
            const values = await annotationService.fetchAvailableAnnotationsForHierarchy([
                "cell_line",
                "cas9",
            ]);
            expect(values).to.deep.equal(annotationNames);
        });
    });
});
