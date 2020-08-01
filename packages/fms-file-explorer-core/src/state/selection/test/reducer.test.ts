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
});
