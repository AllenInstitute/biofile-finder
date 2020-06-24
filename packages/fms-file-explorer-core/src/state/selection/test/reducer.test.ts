import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";

describe("Selection reducer", () => {
    describe("SELECT_FILE", () => {
        it("adds file index when new index is selected", async () => {
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

        it("removes file set after deselecting last index in set", async () => {
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
