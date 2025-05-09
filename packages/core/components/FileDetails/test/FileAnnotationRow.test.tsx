import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState } from "../../../state";
import { NON_RESIZEABLE_CELL_TEST_ID } from "../../FileRow/Cell";
import FileAnnotationRow from "../FileAnnotationRow";

import styles from "../FileAnnotationRow.module.css";

describe("<FileAnnotationRow />", () => {
    describe("Dynamic styling", () => {
        [true, false].forEach((shouldDisplaySmallFont) => {
            it(`Has${
                shouldDisplaySmallFont ? "" : " no"
            } small font style when shouldDisplaySmallFont is ${shouldDisplaySmallFont}`, () => {
                // Arrange
                const annotationName = "test-annotation-name";
                const annotationValue = "90123131";
                const { store } = configureMockStore({
                    state: mergeState(initialState, {
                        selection: {
                            shouldDisplaySmallFont,
                        },
                    }),
                });

                // Act
                const { getAllByTestId } = render(
                    <Provider store={store}>
                        <FileAnnotationRow name={annotationName} value={annotationValue} />
                    </Provider>
                );

                // Assert
                const cells = getAllByTestId(NON_RESIZEABLE_CELL_TEST_ID);
                expect(cells).to.be.lengthOf(2);
                expect(cells[0].classList.contains(styles.smallFont)).to.equal(
                    shouldDisplaySmallFont
                );
                expect(cells[1].classList.contains(styles.smallFont)).to.equal(
                    shouldDisplaySmallFont
                );
            });
        });

        it("displays expand/collapse buttons for long annotations", async () => {
            // Arrange
            const annotationName = "test-annotation-name";
            const annotationValueSuperLong = "This sentence contains 38 characters. "
                .repeat(10)
                .trim();
            const { store, logicMiddleware } = configureMockStore({ state: initialState });

            const { getByTestId, queryByTestId, getByText } = render(
                <Provider store={store}>
                    <FileAnnotationRow name={annotationName} value={annotationValueSuperLong} />
                </Provider>
            );

            // Act / Assert
            expect(queryByTestId("expand-metadata")).to.exist;
            expect(queryByTestId("collapse-metadata")).not.to.exist;
            expect(getByText(annotationValueSuperLong).classList.contains(styles.valueTruncated)).to
                .be.true;

            fireEvent.click(getByTestId("expand-metadata"));
            await logicMiddleware.whenComplete();

            expect(queryByTestId("collapse-metadata")).to.exist;
            expect(queryByTestId("expand-metadata")).not.to.exist;
            expect(getByText(annotationValueSuperLong).classList.contains(styles.valueTruncated)).to
                .be.false;
        });

        it("hides expand/collapse buttons for short annotations", () => {
            // Arrange
            const annotationName = "test-annotation-name";
            const annotationValueShort = "This sentence contains 38 characters.";
            const { store } = configureMockStore({ state: initialState });

            // Act
            const { getByText, queryByTestId } = render(
                <Provider store={store}>
                    <FileAnnotationRow name={annotationName} value={annotationValueShort} />
                </Provider>
            );

            // Assert
            expect(queryByTestId("expand-metadata")).not.to.exist;
            expect(queryByTestId("collapse-metadata")).not.to.exist;
            expect(getByText(annotationValueShort).classList.contains(styles.valueTruncated)).to.be
                .false;
        });
    });
});
