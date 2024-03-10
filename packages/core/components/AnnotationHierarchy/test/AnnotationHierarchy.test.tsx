import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Provider } from "react-redux";

import { initialState } from "../../../state";
import { DND_LIST_CONTAINER_ID } from "../../DnDList/DnDList";
import AnnotationHierarchy from "..";

import styles from "../AnnotationHierarchy.module.css";
import Annotation from "../../../entity/Annotation";

describe("<AnnotationHierarchy />", () => {
    describe("Dynamic styling", () => {
        [true, false].forEach((shouldDisplaySmallFont) => {
            it(`Has ${
                shouldDisplaySmallFont ? "" : "no"
            } small font style when shouldDisplaySmallFont is ${shouldDisplaySmallFont}`, () => {
                // Arrange
                const { store } = configureMockStore({
                    state: mergeState(initialState, {
                        selection: {
                            annotationHierarchy: [
                                new Annotation({
                                    annotationDisplayName: "any",
                                    annotationName: "any",
                                    description: "",
                                    type: "",
                                }),
                            ],
                            shouldDisplaySmallFont,
                        },
                    }),
                });

                // Act
                const { getByTestId } = render(
                    <Provider store={store}>
                        <DragDropContext
                            onDragEnd={() => {
                                /* noop */
                            }}
                        >
                            <AnnotationHierarchy highlightDropZone />
                        </DragDropContext>
                    </Provider>
                );

                // Assert
                expect(
                    getByTestId(DND_LIST_CONTAINER_ID).classList.contains(styles.smallFont)
                ).to.equal(shouldDisplaySmallFont);
            });
        });
    });
});
