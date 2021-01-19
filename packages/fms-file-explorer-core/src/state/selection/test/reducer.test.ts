import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import interaction from "../../interaction";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import FileFilter from "../../../entity/FileFilter";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";

describe("Selection reducer", () => {
    [
        selection.actions.SET_ANNOTATION_HIERARCHY,
        interaction.actions.SET_FILE_EXPLORER_SERVICE_BASE_URL,
    ].forEach((actionConstant) =>
        it(`clears selected file state when ${actionConstant} is fired`, () => {
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

            const action = {
                type: actionConstant,
            };

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);
            const nextSelection = selection.selectors.getFileSelection({
                ...initialState,
                selection: nextSelectionState,
            });

            // assert
            expect(prevSelection.count()).to.equal(3); // sanity-check
            expect(nextSelection.count()).to.equal(0);
        })
    );

    describe("DESELECT_DISPLAY_ANNOTATION", () => {
        it("removes any column widths configured for a display annotation if a user has removed it from the list of annotations to display", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                columnWidths: {
                    [TOP_LEVEL_FILE_ANNOTATIONS[0].name]: 0.5,
                    [TOP_LEVEL_FILE_ANNOTATIONS[1].name]: 0.3,
                },
                displayAnnotations: [TOP_LEVEL_FILE_ANNOTATIONS[0], TOP_LEVEL_FILE_ANNOTATIONS[1]],
            };

            const action = selection.actions.deselectDisplayAnnotation(
                TOP_LEVEL_FILE_ANNOTATIONS[0]
            );

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getAnnotationsToDisplay({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal([TOP_LEVEL_FILE_ANNOTATIONS[1]]);

            expect(
                selection.selectors.getColumnWidths({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal({
                [TOP_LEVEL_FILE_ANNOTATIONS[1].name]: 0.3,
            });
        });
    });

    describe("SELECT_DISPLAY_ANNOTATION", () => {
        it("performs an update when replace=false", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                displayAnnotations: [TOP_LEVEL_FILE_ANNOTATIONS[0]],
            };

            const action = selection.actions.selectDisplayAnnotation(
                TOP_LEVEL_FILE_ANNOTATIONS[1] // replace=false is the default
            );

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getAnnotationsToDisplay({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal([TOP_LEVEL_FILE_ANNOTATIONS[0], TOP_LEVEL_FILE_ANNOTATIONS[1]]);
        });

        it("performs a set when replace=true", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                displayAnnotations: [TOP_LEVEL_FILE_ANNOTATIONS[0]],
            };

            const action = selection.actions.selectDisplayAnnotation(
                TOP_LEVEL_FILE_ANNOTATIONS[1],
                true
            );

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getAnnotationsToDisplay({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal([TOP_LEVEL_FILE_ANNOTATIONS[1]]);
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
});
