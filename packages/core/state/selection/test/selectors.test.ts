import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
import ExcludeFilter from "../../../entity/FileFilter/ExcludeFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import { DataSourceLoadStage } from "../../../services/DatabaseService";
import { mergeState } from "../../../util/redux-utils";

describe("Selection selectors", () => {
    describe("getPythonSnippet", () => {
        const stateForSourceType = (uri: string, type?: string) =>
            mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        databaseService: { getResolvedType: () => type },
                        executionEnvService: { getOS: () => "Darwin" },
                    },
                },
                selection: {
                    dataSources: [{ name: "source", uri }],
                },
            });

        it("installs only pandas for a source pandas can read on its own", () => {
            // Arrange
            const state = stateForSourceType("https://example.com/a.csv", "csv");

            // Act
            const { setup } = selection.selectors.getPythonSnippet(state);

            // Assert
            expect(setup).to.equal('pip install "pandas>=1.5"');
        });

        it("adds deltalake and pandas for a Delta source", () => {
            // Arrange
            // The snippet reads the table into a dataframe and queries it with
            // pandas, so deltalake alone would leave `import pandas as pd` failing.
            const state = stateForSourceType("s3://bucket/table", "delta");

            // Act
            const { setup } = selection.selectors.getPythonSnippet(state);

            // Assert
            expect(setup).to.equal('pip install "pandas>=1.5" "deltalake"');
        });
    });

    describe("getDataSourceLoadStatus", () => {
        it("describes the stage and size for a single source", () => {
            const state = mergeState(initialState, {
                selection: {
                    dataSourceLoadProgress: {
                        "a.csv": {
                            sourceName: "a.csv",
                            stage: DataSourceLoadStage.DOWNLOADING,
                            fraction: 0.25,
                            bytesTotal: 1000,
                        },
                    },
                },
            });

            const status = selection.selectors.getDataSourceLoadStatus(state);

            expect(status?.fraction).to.be.undefined;
            expect(status?.description).to.equal("Reading data source");
            expect(status?.bytesTotal).to.equal(1000);
        });

        it("averages across sources and names the one furthest from done", () => {
            const state = mergeState(initialState, {
                selection: {
                    dataSourceLoadProgress: {
                        "a.csv": {
                            sourceName: "a.csv",
                            stage: DataSourceLoadStage.FINALIZING,
                            fraction: 1,
                        },
                        "b.csv": {
                            sourceName: "b.csv",
                            stage: DataSourceLoadStage.DOWNLOADING,
                            fraction: 0.5,
                        },
                    },
                },
            });

            const status = selection.selectors.getDataSourceLoadStatus(state);

            expect(status?.fraction).to.be.undefined;
            expect(status?.description).to.equal("Reading data source");
        });

        it("reports a measured fraction once no source is being read", () => {
            const state = mergeState(initialState, {
                selection: {
                    dataSourceLoadProgress: {
                        "a.csv": {
                            sourceName: "a.csv",
                            stage: DataSourceLoadStage.VALIDATING,
                            fraction: 0.8,
                        },
                    },
                },
            });

            const status = selection.selectors.getDataSourceLoadStatus(state);

            expect(status?.fraction).to.be.closeTo(0.8 * 0.92, 1e-9);
            expect(status?.description).to.equal("Validating data source");
        });
    });

    describe("getIsLoadingColumns", () => {
        it("is true before a query from the URL has been applied", () => {
            // arrange / act / assert
            expect(selection.selectors.getIsLoadingColumns(initialState)).to.equal(true);
        });

        it("is true while a data source is being prepared", () => {
            // arrange
            const state = mergeState(initialState, {
                selection: { isLoadingDataSource: true, selectedQuery: "Test query" },
            });

            // act / assert
            expect(selection.selectors.getIsLoadingColumns(state)).to.equal(true);
        });

        it("is true while the selected query's columns are being read", () => {
            // arrange
            const state = mergeState(initialState, {
                metadata: { isLoadingAnnotations: true },
                selection: { selectedQuery: "Test query" },
            });

            // act / assert
            expect(selection.selectors.getIsLoadingColumns(state)).to.equal(true);
        });

        it("is false once a query is selected and its columns have loaded", () => {
            // arrange
            const state = mergeState(initialState, {
                selection: { selectedQuery: "Test query" },
            });

            // act / assert
            expect(selection.selectors.getIsLoadingColumns(state)).to.equal(false);
        });
    });

    describe("getGroupedByFilterName", () => {
        it("leaves display value blank for any/none filters regardless of type", () => {
            // arrange
            const annotations = [
                ...TOP_LEVEL_FILE_ANNOTATIONS, // includes string, date and number types
                // Add a boolean-type annotation for testing
                new Annotation({
                    annotationDisplayName: "IsTestAnnotation",
                    annotationName: "IsTestAnnotation",
                    description: "A test annotation of type boolean",
                    type: AnnotationType.BOOLEAN,
                }),
            ];
            const filters = [
                new ExcludeFilter("IsTestAnnotation"), // boolean
                new IncludeFilter(AnnotationName.UPLOADED), // date
                new ExcludeFilter(AnnotationName.FILE_SIZE), // number
                new IncludeFilter(AnnotationName.FILE_NAME), // string
            ];
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    filters,
                },
            });

            // act
            const groupedFilters = selection.selectors.getGroupedByFilterName(state);

            // assert
            Object.values(groupedFilters).forEach((entry) =>
                expect(entry[0].displayValue).to.equal("")
            );
        });

        it("groups a nested sub-field filter under its full dotted path", () => {
            // arrange
            const annotations = [
                new Annotation({
                    annotationName: ["Well", "Dose", "Unit"],
                    description: "Dose unit",
                    type: AnnotationType.STRING,
                    pathIsArray: [true, false, false],
                }),
            ];
            const filters = [new FileFilter(["Well", "Dose", "Unit"], "mg", FilterType.DEFAULT)];
            const state = mergeState(initialState, {
                metadata: { annotations },
                selection: { filters },
            });

            // act
            const groupedFilters = selection.selectors.getGroupedByFilterName(state);

            // assert: keyed by the dotted path, with a display value resolved via the
            // full-path entry of the annotation map (not collapsed to the leaf "Unit").
            expect(Object.keys(groupedFilters)).to.deep.equal(["Well.Dose.Unit"]);
            expect(groupedFilters["Well.Dose.Unit"][0].displayValue).to.equal("mg");
        });
    });
});
