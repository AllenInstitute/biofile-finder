import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import interaction from "../../interaction";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import NumericRange from "../../../entity/NumericRange";

describe("Selection reducer", () => {
    [
        selection.actions.SET_ANNOTATION_HIERARCHY,
        interaction.actions.SET_FILE_EXPLORER_SERVICE_BASE_URL,
    ].forEach((actionConstant) =>
        it(`clears selected file state when ${actionConstant} is fired`, () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                selectedFileRangesByFileSet: {
                    abc123: [new NumericRange(1, 3)],
                },
            };

            const action = {
                type: actionConstant,
            };

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getSelectedFileRangesByFileSet({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.be.empty;
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
});
