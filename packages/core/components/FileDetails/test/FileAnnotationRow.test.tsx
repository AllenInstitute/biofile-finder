import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
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
    });
});
