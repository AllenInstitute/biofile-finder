import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import { initialState as initialSelectionState } from "../reducer";
import interaction from "../../interaction";
import { Environment } from "../../../constants";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import FileDetail from "../../../entity/FileDetail";
import FileFilter from "../../../entity/FileFilter";
import FileFolder from "../../../entity/FileFolder";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import FileSort, { SortOrder } from "../../../entity/FileSort";
import NumericRange from "../../../entity/NumericRange";
import { FileView, SearchParamsComponents } from "../../../entity/SearchParams";
import { DataSource } from "../../../services/DataSourceService";

describe("Selection reducer", () => {
    [
        selection.actions.setAnnotationHierarchy([]),
        interaction.actions.initializeApp({
            environment: "TEST",
        }),
    ].forEach((expectedAction) =>
        it(`clears selected file state when ${expectedAction.type} is fired`, () => {
            // arrange
            const prevSelection = new FileSelection().select({
                fileSet: new FileSet(),
                index: new NumericRange(1, 3),
                sortOrder: 0,
            });
            const initialSelectionState = {
                ...selection.initialState,
                fileSelection: prevSelection,
            };
            // act
            const nextSelectionState = selection.reducer(initialSelectionState, expectedAction);
            const nextSelection = selection.selectors.getFileSelection({
                ...initialState,
                selection: nextSelectionState,
            });
            // assert
            expect(prevSelection.count()).to.equal(3); // consistency check
            expect(nextSelection.count()).to.equal(0);
        })
    );

    describe(selection.actions.CHANGE_DATA_SOURCES, () => {
        it("clears file selection and open folders", () => {
            // Arrange
            const state = {
                ...selection.initialState,
                annotationHierarchy: ["Cell Line"],
                fileSelection: new FileSelection().select({
                    fileSet: new FileSet(),
                    index: 4,
                    sortOrder: 3,
                }),
                filters: [new FileFilter("file_id", "1238401234")],
                openFileFolders: [new FileFolder(["AICS-11"])],
            };
            const dataSources: DataSource[] = [
                {
                    name: "My Tiffs",
                    version: 2,
                    type: "csv",
                    id: "13123019",
                    uri: "",
                },
            ];

            // Act
            const actual = selection.reducer(
                state,
                selection.actions.changeDataSources(dataSources)
            );

            // Assert
            expect(actual.dataSources).to.deep.equal(dataSources);
            expect(actual.fileSelection.count()).to.equal(0);
            expect(actual.openFileFolders).to.be.empty;
        });
    });

    describe("RESET_QUERY_FIELDS", () => {
        it("clears all search params", () => {
            // Arrange
            const dataSources: DataSource[] = [{ name: "Test file", id: "987654321" }];
            const sourceMetadata: DataSource = { id: "123", name: "Metadata info" };
            const sourceProvenance: DataSource = { id: "456", name: "Provenance info" };
            const state = {
                ...selection.initialState,
                annotationHierarchy: ["Cell Line"],
                columns: [{ name: "file_id", width: 0.5 }],
                filters: [new FileFilter("file_id", "1238401234")],
                fileView: FileView.LIST,
                openFileFolders: [new FileFolder(["AICS-11"])],
                shouldShowNullGroups: false,
                sortColumn: new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC),
                dataSources: dataSources,
                sourceMetadata,
                sourceProvenance,
            };
            // This a method of enumerating all keys in an interface and mapping them to a
            // state variable. If we add more search params in the future,
            // this will error if they aren't present in the reset method
            type KeysEnum<T> = { [P in keyof Required<T>]: string };
            const searchParamsExpected: KeysEnum<SearchParamsComponents> = {
                columns: "columns",
                hierarchy: "annotationHierarchy",
                fileView: "fileView",
                sources: "dataSources",
                sourceMetadata: "sourceMetadata",
                prov: "sourceProvenance",
                filters: "filters",
                openFolders: "openFileFolders",
                sortColumn: "sortColumn",
                showNoValueGroups: "shouldShowNullGroups",
            };

            // Act
            const actual = selection.reducer(state, selection.actions.resetQueryProperties());

            // Assert
            const actualStateAsObj = Object.entries(actual);
            const actualWithoutUndefined = Object.entries(actual).filter((entry) => {
                return entry[1] !== undefined;
            });
            // The state was fully reset to initial values
            expect(actualWithoutUndefined).to.deep.equal(Object.entries(initialSelectionState));

            // Every possible search param was reset in state
            Object.entries(searchParamsExpected).forEach((param) => {
                expect(
                    actualStateAsObj.some((entry) => {
                        return entry[0] === param[1];
                    })
                ).to.be.true;
            });
        });

        it("deselects selected files", () => {
            const mockFileDetail = new FileDetail(
                {
                    annotations: [],
                    file_path: "testfile.txt",
                    file_id: "abc13",
                    file_name: "MyFile.txt",
                    file_size: 7,
                    uploaded: "01/01/01",
                },
                Environment.TEST
            );
            const fileSet = new FileSet({
                filters: [new FileFilter("foo", "bar")],
            });
            const prevSelection = new FileSelection().select({
                fileSet: fileSet,
                index: new NumericRange(3, 10),
                sortOrder: 0,
            });
            const state = {
                ...selection.initialState,
                fileSelection: prevSelection,
                fileForDetailPanel: mockFileDetail,
            };

            // Act
            const nextSelectionState = selection.reducer(
                state,
                selection.actions.resetQueryProperties()
            );

            // Assert
            expect(
                selection.selectors.getFileSelection({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal(new FileSelection());
            expect(
                interaction.selectors.getFileForDetailPanel({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.equal(undefined);
        });
    });

    describe("SET_COLUMNS", () => {
        it("performs a set", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                columns: [{ name: "Green", width: 0.11 }],
            };
            const columns = [
                { name: "Orange", width: 0.42 },
                { name: "Red", width: 0.47 },
            ];

            const action = selection.actions.setColumns(columns);

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getColumns({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal(columns);
        });
    });

    describe("SET_FILE_FILTERS", () => {
        it("sets file filters", () => {
            // Arrange
            const initialSelectionState = {
                ...selection.initialState,
                filters: [],
            };
            const expectedFileFilters = [
                new FileFilter("Cell Line", "AICS-0"),
                new FileFilter("Date Created", "02/14/24"),
            ];
            const action = selection.actions.setFileFilters(expectedFileFilters);

            // Act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // Assert
            expect(
                selection.selectors.getFileFilters({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal(expectedFileFilters);
        });

        it("resets file selection", () => {
            // Arrange
            const initialSelectionState = {
                ...selection.initialState,
                filters: [new FileFilter("Date Created", "01/01/01")],
                fileSelection: new FileSelection().select({
                    fileSet: new FileSet(),
                    index: 4,
                    sortOrder: 0,
                }),
            };

            const action = selection.actions.setFileFilters([
                new FileFilter("Cell Line", "AICS-0"),
            ]);

            // Act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // Assert
            expect(
                selection.selectors.getFileSelection({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal(new FileSelection());
        });
    });

    describe("SORT_COLUMN", () => {
        it("sorts column to descending if no sort present", () => {
            // Arrange
            const state = {
                ...selection.initialState,
                sortColumn: undefined,
            };
            const expected = new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC);

            // Act
            const selectionState = selection.reducer(
                state,
                selection.actions.sortColumn(AnnotationName.FILE_SIZE)
            );
            const actual = selection.selectors.getSortColumn({
                ...initialState,
                selection: selectionState,
            });

            // Assert
            expect(expected.equals(actual)).to.be.true;
        });

        it("sorts column to descending if another column is sorted", () => {
            // Arrange
            const state = {
                ...selection.initialState,
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
            };
            const expected = new FileSort(AnnotationName.FILE_SIZE, SortOrder.DESC);

            // Act
            const selectionState = selection.reducer(
                state,
                selection.actions.sortColumn(AnnotationName.FILE_SIZE)
            );
            const actual = selection.selectors.getSortColumn({
                ...initialState,
                selection: selectionState,
            });

            // Assert
            expect(expected.equals(actual)).to.be.true;
        });

        it("makes sort ascending upon sorting an already descending sorted column", () => {
            // Arrange
            const state = {
                ...selection.initialState,
                sortColumn: new FileSort(AnnotationName.FILE_NAME, SortOrder.DESC),
            };
            const expected = new FileSort(AnnotationName.FILE_NAME, SortOrder.ASC);

            // Act
            const selectionState = selection.reducer(
                state,
                selection.actions.sortColumn(AnnotationName.FILE_NAME)
            );
            const actual = selection.selectors.getSortColumn({
                ...initialState,
                selection: selectionState,
            });

            // Assert
            expect(expected.equals(actual)).to.be.true;
        });

        it("removes sort upon sorting an already ascending sorted column", () => {
            // Arrange
            const state = {
                ...selection.initialState,
                sortColumn: new FileSort(AnnotationName.FILE_ID, SortOrder.ASC),
            };

            // Act
            const selectionState = selection.reducer(
                state,
                selection.actions.sortColumn(AnnotationName.FILE_ID)
            );
            const actual = selection.selectors.getSortColumn({
                ...initialState,
                selection: selectionState,
            });

            // Assert
            expect(actual).to.be.undefined;
        });
    });

    describe("interaction.actions.REFRESH", () => {
        it("sets available annotations to loading", () => {
            // Arrange
            const initialSelectionState = { ...selection.initialState };

            // Act
            const nextSelectionState = selection.reducer(
                initialSelectionState,
                interaction.actions.refresh()
            );

            // Assert
            expect(
                selection.selectors.getAvailableAnnotationsForHierarchyLoading({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.be.true;
        });

        it("clears file selection", () => {
            // Arrange
            const initialSelectionState = {
                ...selection.initialState,
                fileSelection: new FileSelection([
                    { fileSet: new FileSet(), selection: new NumericRange(0, 14), sortOrder: 0 },
                ]),
            };

            // (sanity-check) file selection count is not 0 before
            expect(
                selection.selectors
                    .getFileSelection({
                        ...initialState,
                        selection: initialSelectionState,
                    })
                    .count()
            ).to.be.equal(15);

            // Act
            const nextSelectionState = selection.reducer(
                initialSelectionState,
                interaction.actions.refresh()
            );

            // Assert
            expect(
                selection.selectors
                    .getFileSelection({
                        ...initialState,
                        selection: nextSelectionState,
                    })
                    .count()
            ).to.be.equal(0);
        });
    });
});
