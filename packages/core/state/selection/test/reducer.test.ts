import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import interaction from "../../interaction";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import FileFilter from "../../../entity/FileFilter";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";
import FileSort, { SortOrder } from "../../../entity/FileSort";
import { AnnotationName } from "../../../entity/Annotation";
import FileFolder from "../../../entity/FileFolder";

describe("Selection reducer", () => {
    it(`clears selected file state when SET_FILE_EXPLORER_SERVICE_BASE_URL is fired`, () => {
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
        const nextSelectionState = selection.reducer(
            initialSelectionState,
            interaction.actions.setFileExplorerServiceBaseUrl("base")
        );

        const nextSelection = selection.selectors.getFileSelection({
            ...initialState,
            selection: nextSelectionState,
        });

        // assert
        expect(prevSelection.count()).to.equal(3); // sanity-check
        expect(nextSelection.count()).to.equal(0);
    });
});

describe("Selection reducer", () => {
    it(`clears selected file state when SET_ANNOTATION_HIERARCHY is fired`, () => {
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
        const nextSelectionState = selection.reducer(
            initialSelectionState,
            selection.actions.setAnnotationHierarchy([])
        );
        const nextSelection = selection.selectors.getFileSelection({
            ...initialState,
            selection: nextSelectionState,
        });

        // assert
        expect(prevSelection.count()).to.equal(3); // sanity-check
        expect(nextSelection.count()).to.equal(0);
    });

    describe(selection.actions.CHANGE_COLLECTION, () => {
        it("clears hierarchy, filters, file selection, and open folders", () => {
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
            const collection = {
                name: "My Tiffs",
                version: 2,
                id: "13123019",
                query: "",
                fixed: false,
                private: true,
                client: "explorer",
                created: new Date(),
                createdBy: "test",
            };

            // Act
            const actual = selection.reducer(state, selection.actions.changeCollection(collection));

            // Assert
            expect(actual.annotationHierarchy).to.be.empty;
            expect(actual.collection).to.deep.equal(collection);
            expect(actual.fileSelection.count()).to.equal(0);
            expect(actual.filters).to.be.empty;
            expect(actual.openFileFolders).to.be.empty;
        });
    });

    describe("SET_DISPLAY_ANNOTATIONS", () => {
        it("performs a set", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                displayAnnotations: [TOP_LEVEL_FILE_ANNOTATIONS[0]],
            };

            const action = selection.actions.setDisplayAnnotations(TOP_LEVEL_FILE_ANNOTATIONS);

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getAnnotationsToDisplay({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal(TOP_LEVEL_FILE_ANNOTATIONS);
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

            // (sanity-check) available annotations are not loading before refresh
            expect(
                selection.selectors.getAvailableAnnotationsForHierarchyLoading({
                    ...initialState,
                    selection: initialSelectionState,
                })
            ).to.be.false;

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
