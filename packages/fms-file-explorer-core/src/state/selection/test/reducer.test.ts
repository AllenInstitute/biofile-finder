import { expect } from "chai";

import { initialState } from "../../";
import interaction from "../../interaction";
import selection from "../";

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
});
