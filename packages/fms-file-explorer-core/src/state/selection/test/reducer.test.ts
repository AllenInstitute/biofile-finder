import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import interaction from "../../interaction";

describe("Selection reducer", () => {
    [
        selection.actions.SET_ANNOTATION_HIERARCHY,
        interaction.actions.SET_FILE_EXPLORER_SERVICE_BASE_URL,
    ].forEach((actionConstant) =>
        it(`clears selected file state when ${actionConstant} is fired`, () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                selectedFileIndicesByFileSet: {
                    abc123: [1, 2, 3],
                },
            };

            const action = {
                type: actionConstant,
            };

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getSelectedFileIndicesByFileSet({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.be.empty;
        })
    );

    describe("SELECT_FILE", () => {
        it("adds file index when new index is selected", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                selectedFileIndicesByFileSet: {
                    abc123: [5],
                },
            };

            const action = {
                payload: {
                    correspondingFileSet: "abc123",
                    fileIndex: [5, 22],
                    updateExistingSelection: false,
                },
                type: selection.actions.SELECT_FILE,
            };

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getSelectedFileIndicesByFileSet({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.deep.equal({
                abc123: [5, 22],
            });
        });

        it("removes file set after deselecting last index in set", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                selectedFileIndicesByFileSet: {
                    abc123: [5],
                },
            };

            const action = {
                payload: {
                    correspondingFileSet: "abc123",
                    fileIndex: [],
                    updateExistingSelection: true,
                },
                type: selection.actions.SELECT_FILE,
            };

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getSelectedFileIndicesByFileSet({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.be.empty;
        });
    });
});
