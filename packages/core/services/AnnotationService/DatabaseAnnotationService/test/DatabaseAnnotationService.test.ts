import { expect } from "chai";
import sinon from "sinon";

import FileFilter, { FilterType } from "../../../../entity/FileFilter";
import DatabaseService from "../../../DatabaseService";
import DatabaseServiceNoop from "../../../DatabaseService/DatabaseServiceNoop";
import SQLBuilder from "../../../../entity/SQLBuilder";

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

    // Test SQL generation, not the return values
    describe("fetchFilteredValuesForAnnotation", () => {
        const sandbox = sinon.createSandbox();
        let querySpy = sandbox.spy();
        afterEach(() => {
            sandbox.restore();
        });

        class MockDatabaseService extends DatabaseService {
            public query(sql: string): Promise<any> {
                querySpy(sql); // pass SQL to the spy func
                return Promise.resolve([]);
            }
        }
        const databaseService = new MockDatabaseService();
        const filterToRegex = (filter: FileFilter) => {
            return SQLBuilder.regexMatchValueInList(filter.name, filter.value);
        };

        it("uses ANDs and ORs correctly in sql with multiple filters and values", async () => {
            querySpy = sandbox.spy();
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["test source"],
                databaseService,
            });

            // Filters with different quantities of values to match
            const filter1a = new FileFilter("filter1", "value1a");
            const filter1b = new FileFilter("filter1", "value1b");
            const filter1c = new FileFilter("filter1", "value1c");

            const filter2a = new FileFilter("filter2", "value2a");
            const filter2b = new FileFilter("filter2", "value2b");

            const filter3 = new FileFilter("filter3", "value3");

            await annotationService.fetchHierarchyValuesUnderPath(
                [], // hierarchy; skipping to simplify test
                [], // path so far; skipping to simplify test
                [filter1a, filter1b, filter1c, filter2a, filter2b, filter3] // user-applied filters
            );

            // Construct expected regex for each set of filters
            const filter1OR = `${filterToRegex(filter1a)} OR ${filterToRegex(
                filter1b
            )} OR ${filterToRegex(filter1c)}`;
            const filter2OR = `${filterToRegex(filter2a)} OR ${filterToRegex(filter2b)}`;
            const filter3OR = `${filterToRegex(filter3)} OR`; // Should not exist

            // Make sure parentheses are applied correctly
            const filtersAND = `\(${filter1OR}\) AND \(${filter2OR}\) AND \(${filterToRegex(
                filter3
            )}\)`;

            // Check each OR statement separately
            expect(querySpy.calledWithMatch(filter1OR)).to.be.true;
            expect(querySpy.calledWithMatch(filter2OR)).to.be.true;
            expect(querySpy.calledWithMatch(filter3OR)).not.to.be.true;

            // Check statements connected by AND
            expect(querySpy.calledWithMatch(filtersAND)).to.be.true;
        });

        it("constructs sql correctly with hierarchy path", async () => {
            querySpy = sandbox.spy();
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["test source"],
                databaseService,
            });

            const filter1a = new FileFilter("filter1", "value1a");
            const filter1b = new FileFilter("filter1", "value1b");

            await annotationService.fetchHierarchyValuesUnderPath(
                ["group1", "group2", "group3", "group4"], // annotations to group by
                ["value1", "value2"], // path so far
                [filter1a, filter1b] // user-applied filters
            );

            // Find potential values for the current level of the grouping hierarchy (group3, not group4)
            expect(querySpy.calledWithMatch(/SELECT DISTINCT "group3"/)).to.be.true;

            // Consistency check: still formats "OR" statement correctly
            expect(
                querySpy.calledWithMatch(
                    `\(${filterToRegex(filter1a)} OR ${filterToRegex(filter1b)}\)`
                )
            ).to.be.true;

            // Includes a filter for each group in the hierarchy path so far
            const hierarchyPath1 = filterToRegex(new FileFilter("group1", "value1"));
            expect(querySpy.calledWithMatch(hierarchyPath1)).to.be.true;
            const hierarchyPath2 = filterToRegex(new FileFilter("group2", "value2"));
            expect(querySpy.calledWithMatch(hierarchyPath2)).to.be.true;
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
