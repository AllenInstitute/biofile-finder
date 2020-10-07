import { expect } from "chai";

import selection from "..";
import { initialState, metadata } from "../..";
import interaction from "../../interaction";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
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
            const prevSelection = new FileSelection()
                .select({ fileSet: new FileSet(), index: new NumericRange(1, 3), sortOrder: 0 });
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
            expect(prevSelection.size()).to.equal(3); // sanity-check
            expect(nextSelection.size()).to.equal(0);
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

    describe("metadata.actions.RECEIVE_ANNOTATIONS", () => {
        it("clears annotations hierarchy", () => {
            // arrange
            const initialSelectionState = {
                ...selection.initialState,
                annotationHierarchy: TOP_LEVEL_FILE_ANNOTATIONS,
            };

            const action = metadata.actions.receiveAnnotations(TOP_LEVEL_FILE_ANNOTATIONS);

            // act
            const nextSelectionState = selection.reducer(initialSelectionState, action);

            // assert
            expect(
                selection.selectors.getAnnotationHierarchy({
                    ...initialState,
                    selection: nextSelectionState,
                })
            ).to.be.empty;
        });
    });
});
