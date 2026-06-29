import { expect } from "chai";
import sinon from "sinon";

import DatabaseService from "../../../DatabaseService";
import DatabaseServiceNoop from "../../../DatabaseService/DatabaseServiceNoop";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../../constants";
import Annotation from "../../../../entity/Annotation";
import { AnnotationType } from "../../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../../entity/FileFilter";
import { DEFAULT_COLUMN_WIDTH, MINIMUM_COLUMN_WIDTH } from "../../../../entity/SearchParams";
import SQLBuilder from "../../../../entity/SQLBuilder";

import DatabaseAnnotationService from "..";

describe("DatabaseAnnotationService", () => {
    describe("fetchAnnotationValues", () => {
        const annotationName = "foo";
        const values = ["A", "B", "Cc", "dD"].map((name, index) => ({
            [annotationName]: name.toLowerCase() + index,
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): { promise: Promise<any> } {
                return { promise: Promise.resolve(values) };
            }
            public async fetchAnnotations(): Promise<Annotation[]> {
                return [annotationName].map(
                    (name) =>
                        new Annotation({
                            annotationName: name,
                            description: `${name} description`,
                            type: AnnotationType.STRING,
                        })
                );
            }
        }
        const databaseService = new MockDatabaseService();

        it("issues request for 'foo' values", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["a", "b or c"],
                databaseService,
            });
            const actualValues = await annotationService.fetchValues(annotationName);
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
        const mockAnnotationName = "mock_annotation"; // snake case to match annotation properties in annotation map
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): { promise: Promise<any> } {
                return { promise: Promise.resolve(annotations) };
            }
            public async fetchAnnotations(): Promise<Annotation[]> {
                return [mockAnnotationName, ...annotationNames].map(
                    (name) =>
                        new Annotation({
                            annotationName: name,
                            description: `${name} description`,
                            type: AnnotationType.STRING,
                        })
                );
            }
        }
        const databaseService = new MockDatabaseService();
        const mockDataSourceName = "mockDataSourceName";

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
        const valuesByAnnotation = ["A", "B", "Cc", "dD"].map((name, index) => ({
            foo: name + index,
            bar: name + index,
        }));
        class MockDatabaseService extends DatabaseServiceNoop {
            public query(): { promise: Promise<any> } {
                return { promise: Promise.resolve(valuesByAnnotation) };
            }
            public async fetchAnnotations(): Promise<Annotation[]> {
                return ["foo", "bar"].map(
                    (name) =>
                        new Annotation({
                            annotationName: name,
                            description: `${name} description`,
                            type: AnnotationType.STRING,
                        })
                );
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
            public query(sql: string): { promise: Promise<any> } {
                querySpy(sql); // pass SQL to the spy func
                return { promise: Promise.resolve([]) };
            }
            public async fetchAnnotations(): Promise<Annotation[]> {
                return ["foo", "bar", "zip"].map(
                    (name) =>
                        new Annotation({
                            annotationName: name,
                            description: `${name} description`,
                            type: AnnotationType.STRING,
                        })
                );
            }
        }
        const databaseService = new MockDatabaseService();
        const filterToRegex = (filter: FileFilter) => {
            return SQLBuilder.regexMatchValueInList(`"${filter.name}"`, filter.value);
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
                ["foo"],
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
                ["foo", "bar", "zip"], // annotations to group by
                ["value1", "value2"], // path so far
                [filter1a, filter1b] // user-applied filters
            );

            // Find potential values for the current level of the grouping hierarchy (group3, not group4)
            expect(querySpy.calledWithMatch(/SELECT DISTINCT "zip"/)).to.be.true;

            // Consistency check: still formats "OR" statement correctly
            expect(
                querySpy.calledWithMatch(
                    `\(${filterToRegex(filter1a)} OR ${filterToRegex(filter1b)}\)`
                )
            ).to.be.true;

            // Includes a filter for each group in the hierarchy path so far
            const hierarchyPath1 = filterToRegex(new FileFilter("foo", "value1"));
            expect(querySpy.calledWithMatch(hierarchyPath1)).to.be.true;
            const hierarchyPath2 = filterToRegex(new FileFilter("bar", "value2"));
            expect(querySpy.calledWithMatch(hierarchyPath2)).to.be.true;
        });
    });

    describe("fetchAvailableAnnotationsForHierarchy", () => {
        const annotationNames = ["Cell Line", "Is Split Scene", "Well.Dose"];
        class MockDatabaseService extends DatabaseService {
            public query(_sql: string): { promise: Promise<any> } {
                return {
                    promise: Promise.resolve([{ "1": 1 }]),
                };
            }
            public async fetchAnnotations(): Promise<Annotation[]> {
                return annotationNames.map(
                    (a) =>
                        new Annotation({
                            annotationName: a,
                            description: `${a} description`,
                            type: AnnotationType.STRING,
                            pathIsArray: a.split(".").map(() => false),
                        })
                );
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

        it("returns null after 30s and cancels all in-flight hierarchy queries", async () => {
            const clock = sinon.useFakeTimers();
            let cancelledCount = 0;

            class HangingDatabaseService extends DatabaseServiceNoop {
                public query(): { promise: Promise<any>; cancel: () => void } {
                    return {
                        promise: new Promise(() => {
                            // Intentionally never resolves to force the global timeout path.
                        }),
                        cancel: () => {
                            cancelledCount += 1;
                        },
                    };
                }
            }

            class TimeoutAnnotationService extends DatabaseAnnotationService {
                public async fetchAnnotations(): Promise<Annotation[]> {
                    return ["A", "B", "C"].map(
                        (name) =>
                            new Annotation({
                                annotationName: name,
                                description: "",
                                type: AnnotationType.STRING,
                            })
                    );
                }
            }

            const annotationService = new TimeoutAnnotationService({
                dataSourceNames: ["mock1"],
                databaseService: new HangingDatabaseService(),
            });

            const valuesPromise = annotationService.fetchAvailableAnnotationsForHierarchy([]);
            await clock.tickAsync(30_001);

            try {
                expect(await valuesPromise).to.be.null;
                expect(cancelledCount).to.equal(3);
            } finally {
                clock.restore();
            }
        });
    });

    describe("fetchOptimalWidthForAnnotations", () => {
        it("returns widths based on longest value lengths from the database", async () => {
            // Mock query returning max lengths for each annotation
            class MockDatabaseService extends DatabaseServiceNoop {
                public query(): { promise: Promise<any> } {
                    return {
                        promise: Promise.resolve([{ "Cell Line": 200, Gene: 100 }]),
                    };
                }
            }
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["source1"],
                databaseService: new MockDatabaseService(),
            });

            const result = await annotationService.fetchOptimalWidthForAnnotations([
                new Annotation({
                    annotationName: "Cell Line",
                    description: "",
                    type: AnnotationType.STRING,
                }),
                new Annotation({
                    annotationName: "Gene",
                    description: "",
                    type: AnnotationType.STRING,
                }),
            ]);

            // Both annotations should have computed widths (not just DEFAULT_COLUMN_WIDTH)
            expect(result.has("Cell Line")).to.be.true;
            expect(result.has("Gene")).to.be.true;
            // The width for "Cell Line" should reflect max(20, "Cell Line".length=9) = 20
            // and for "Gene" should reflect max(10, "Gene".length=4) = 10
            // Both should be > MINIMUM_COLUMN_WIDTH
            expect(result.get("Cell Line")).to.be.greaterThan(MINIMUM_COLUMN_WIDTH);
            expect(result.get("Gene")).to.be.greaterThan(MINIMUM_COLUMN_WIDTH);
        });

        it("caps width at DEFAULT_COLUMN_WIDTH * 3 when ignoreWidthLimit is false", async () => {
            // Return a very long value length that would exceed the cap
            class MockDatabaseService extends DatabaseServiceNoop {
                public query(): { promise: Promise<any> } {
                    return {
                        promise: Promise.resolve([{ LongAnnotation: 500 }]),
                    };
                }
            }
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["source1"],
                databaseService: new MockDatabaseService(),
            });

            const result = await annotationService.fetchOptimalWidthForAnnotations([
                new Annotation({
                    annotationName: "LongAnnotation",
                    description: "",
                    type: AnnotationType.STRING,
                }),
            ]);

            expect(result.get("LongAnnotation")).to.equal(DEFAULT_COLUMN_WIDTH * 3);
        });

        it("does not cap width when ignoreWidthLimit is true", async () => {
            // Return a very long value length that would exceed the cap
            const annotationLengthValue = 5_000;
            class MockDatabaseService extends DatabaseServiceNoop {
                public query(): { promise: Promise<any> } {
                    return {
                        promise: Promise.resolve([{ LongAnnotation: annotationLengthValue }]),
                    };
                }
            }
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["source1"],
                databaseService: new MockDatabaseService(),
            });

            const result = await annotationService.fetchOptimalWidthForAnnotations(
                [
                    new Annotation({
                        annotationName: "LongAnnotation",
                        description: "",
                        type: AnnotationType.STRING,
                    }),
                ],
                true
            );

            // With ignoreWidthLimit=true, width should not be capped at DEFAULT_COLUMN_WIDTH * 3
            expect(result.get("LongAnnotation")).to.be.greaterThan(DEFAULT_COLUMN_WIDTH * 3);
        });

        it("falls back to DEFAULT_COLUMN_WIDTH when query fails", async () => {
            class MockDatabaseService extends DatabaseServiceNoop {
                public query(): { promise: Promise<any> } {
                    return {
                        promise: Promise.reject(new Error("query error")),
                    };
                }
            }
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["source1"],
                databaseService: new MockDatabaseService(),
            });

            const result = await annotationService.fetchOptimalWidthForAnnotations([
                new Annotation({
                    annotationName: "SomeColumn",
                    description: "",
                    type: AnnotationType.STRING,
                }),
            ]);

            expect(result.get("SomeColumn")).to.equal(DEFAULT_COLUMN_WIDTH);
        });

        it("includes TOP_LEVEL_FILE_ANNOTATIONS with default widths when not in query results", async () => {
            class MockDatabaseService extends DatabaseServiceNoop {
                public query(): { promise: Promise<any> } {
                    return {
                        promise: Promise.resolve([{ CustomAnnotation: 15 }]),
                    };
                }
            }
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["source1"],
                databaseService: new MockDatabaseService(),
            });

            const result = await annotationService.fetchOptimalWidthForAnnotations([
                new Annotation({
                    annotationName: "CustomAnnotation",
                    description: "",
                    type: AnnotationType.STRING,
                }),
            ]);

            // All top-level file annotations should be present with default widths
            for (const annotation of TOP_LEVEL_FILE_ANNOTATIONS) {
                expect(result.has(annotation.name)).to.be.true;
                expect(result.get(annotation.name)).to.equal(DEFAULT_COLUMN_WIDTH);
            }
        });

        it("returns default widths when dataSourceNames is empty", async () => {
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: [],
                databaseService: new DatabaseServiceNoop(),
            });

            const result = await annotationService.fetchOptimalWidthForAnnotations([
                new Annotation({
                    annotationName: "SomeColumn",
                    description: "",
                    type: AnnotationType.STRING,
                }),
            ]);

            // fetchLengthiestValues returns {} for empty data sources, so all should be default
            expect(result.get("SomeColumn")).to.equal(DEFAULT_COLUMN_WIDTH);
        });

        it("uses annotation name length when it is longer than the longest value", async () => {
            const veryLongAnnotationName = "VeryLongAnnotationName".repeat(100); // 2200 chars
            // Annotation name "VeryLongAnnotationName" (2200 chars) > longest value length (51)
            class MockDatabaseService extends DatabaseServiceNoop {
                public query(): { promise: Promise<any> } {
                    return {
                        promise: Promise.resolve([{ [veryLongAnnotationName]: 51 }]),
                    };
                }
            }
            const annotationService = new DatabaseAnnotationService({
                dataSourceNames: ["source1"],
                databaseService: new MockDatabaseService(),
            });

            const resultShortValue = await annotationService.fetchOptimalWidthForAnnotations([
                new Annotation({
                    annotationName: veryLongAnnotationName,
                    description: "",
                    type: AnnotationType.STRING,
                }),
            ]);

            // Now test with a short annotation name but long value
            class MockDatabaseService2 extends DatabaseServiceNoop {
                public query(): { promise: Promise<any> } {
                    return {
                        promise: Promise.resolve([{ X: 51 }]),
                    };
                }
            }
            const annotationService2 = new DatabaseAnnotationService({
                dataSourceNames: ["source1"],
                databaseService: new MockDatabaseService2(),
            });
            const resultShortName = await annotationService2.fetchOptimalWidthForAnnotations([
                new Annotation({
                    annotationName: "X",
                    description: "",
                    type: AnnotationType.STRING,
                }),
            ]);

            // The width for "VeryLongAnnotationName" should be wider because
            // the annotation name is longer than the value
            expect(resultShortValue.get(veryLongAnnotationName)).to.be.greaterThan(
                resultShortName.get("X") ?? Number.POSITIVE_INFINITY
            );
        });
    });
});
