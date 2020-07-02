import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import interaction from "../../interaction";
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
                selectedFileIndicesByFileSet: {
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
                selection.selectors.getSelectedFileIndicesByFileSet({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.be.empty;
        })
    );

    describe("SET_FILE_SELECTION", () => {
        it("assigns selection to fileset", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                selectedFileIndicesByFileSet: {
                    abc123: [new NumericRange(5)],
                },
            };

            const expectation = [new NumericRange(5), new NumericRange(7, 20)];

            const action = {
                payload: {
                    correspondingFileSet: "abc123",
                    selection: expectation,
                },
                type: selection.actions.SET_FILE_SELECTION,
            };

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);
            const actual = selection.selectors.getSelectedFileIndicesByFileSet({
                ...initialState,
                selection: nextSelectionState,
            });

            // assert
            actual["abc123"].forEach((range, index) => {
                expect(range.equals(expectation[index])).to.equal(true);
            });
        });

        it("removes fileset from state if has no selections", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                selectedFileIndicesByFileSet: {
                    abc123: [new NumericRange(7, 20)],
                },
            };

            const action = {
                payload: {
                    correspondingFileSet: "abc123",
                    selection: [],
                },
                type: selection.actions.SET_FILE_SELECTION,
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
