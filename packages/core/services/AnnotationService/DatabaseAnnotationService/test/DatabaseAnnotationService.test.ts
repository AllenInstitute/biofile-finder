import { expect } from "chai";

import FileFilter, { FilterType } from "../../../../entity/FileFilter";
import DatabaseServiceNoop from "../../../DatabaseService/DatabaseServiceNoop";

import DatabaseAnnotationService from "..";

describe("DatabaseAnnotationService", () => {
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
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["a", "b or c"],
                databaseService,
            });
            const actualValues = await annotationService.fetchValues("select_key");
            expect(actualValues).to.be.deep.equal(["a0", "b1", "cc2", "dd3"]);
        });
    });

    describe("fetchRootHierarchyValues", () => {
        const annotationNames = ["Cell Line", "Is Split Scene", "Gene"];
        const annotations = annotationNames.map((name, index) => ({
            mock_annotation: name + index,
            column_name: name,
            column_type: "VARCHAR",
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): Promise<{ [key: string]: string }[]> {
                return Promise.resolve(annotations);
            }
        }
        const databaseService = new MockDatabaseService();
        const mockDataSourceName = "mockDataSourceName";
        const mockAnnotationName = "mock_annotation"; // snake case to match annotation properties in annotation map

        // This test suite does not test the implementation or return values of fetchRootHierarchyValues
        // It simply checks that a DatabaseService query is successfully issued
        it("issues a request for annotation values for the first level of the annotation hierarchy", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [mockDataSourceName],
                databaseService,
            });
            const values = await annotationService.fetchRootHierarchyValues(
                [mockAnnotationName],
                []
            );
            expect(values).to.deep.equal(["Cell Line0", "Is Split Scene1", "Gene2"]);
        });

        it("issues a request for annotation values for the first level of the annotation hierarchy with filters", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [mockDataSourceName],
                databaseService,
            });
            const filter = new FileFilter("annotationName", "annotationValue");
            const values = await annotationService.fetchRootHierarchyValues(
                [mockAnnotationName],
                [filter]
            );
            expect(values).to.deep.equal(["Cell Line0", "Is Split Scene1", "Gene2"]);
        });

        it("issues a request for annotation values for the first level of the annotation hierarchy with typed filters", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [mockDataSourceName],
                databaseService,
            });
            const filter = new FileFilter("annotationName", "annotationValue", FilterType.ANY);
            const values = await annotationService.fetchRootHierarchyValues(
                [mockAnnotationName],
                [filter]
            );
            expect(values).to.deep.equal(["Cell Line0", "Is Split Scene1", "Gene2"]);
        });
    });

    // This test suite does not test the implementation or return values of fetchHierarchyValuesUnderPath
    // It simply checks that a DatabaseService query is successfully issued
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
                dataSourceNames: ["ghjiasd", "second source"],
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
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["mock1"],
                databaseService,
            });
            const filter = new FileFilter("bar", "barValue");
            const values = await annotationService.fetchHierarchyValuesUnderPath(
                ["foo", "bar"],
                ["baz"],
                [filter]
            );
            expect(values).to.deep.equal(["A0", "B1", "Cc2", "dD3"]);
        });

        it("issues request for hierarchy values under a specific path within the hierarchy with typed filters", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["mockDataSource"],
                databaseService,
            });
            const filter = new FileFilter("bar", "barValue", FilterType.FUZZY);
            const values = await annotationService.fetchHierarchyValuesUnderPath(
                ["foo", "bar"],
                ["baz"],
                [filter]
            );
            expect(values).to.deep.equal(["A0", "B1", "Cc2", "dD3"]);
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
                dataSourceNames: ["mock1"],
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
