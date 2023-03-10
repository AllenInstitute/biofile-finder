import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { assert, expect } from "chai";
import * as React from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { Provider } from "react-redux";

import AnnotationList from "..";
import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import FileFilter from "../../../entity/FileFilter";
import { initialState, reducer, reduxLogics, selection } from "../../../state";
import { DND_LIST_CONTAINER_ID } from "../../DnDList/DnDList";

import styles from "../AnnotationList.module.css";

describe("<AnnotationList />", () => {
    before(() => {
        // HACK: disable all react-beautiful-dnd development warnings. There appears to be an issue with its ability to use document.querySelectorAll in a JSDOM/Enzyme.mount context.
        (window as any)["__react-beautiful-dnd-disable-dev-warnings"] = true;
    });

    after(() => {
        // remove hack applied in before()
        delete (window as any)["__react-beautiful-dnd-disable-dev-warnings"];
    });

    describe("Search behavior", () => {
        it("filters list of annotations according to search input", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: annotationsJson.map(
                            (annotation) => new Annotation(annotation)
                        ),
                    },
                }),
            });

            const { getAllByTestId, getByText, getByPlaceholderText } = render(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );
            const queryNumberListItems = () => getAllByTestId("annotation-list-item").length;

            // (Sanity-check) expect all annotations to be in the list
            const allAnnotationDisplayNames = annotationsJson.map(
                (annotation) => annotation.annotationDisplayName
            );
            expect(queryNumberListItems()).to.equal(allAnnotationDisplayNames.length);
            allAnnotationDisplayNames.forEach((annotation) => {
                expect(getByText(annotation)).to.exist;
            });

            // Act: execute a search
            fireEvent.change(getByPlaceholderText("Search..."), {
                target: { value: "created" },
            });

            // Assert: expect a filtered list, and for it to include only annotations similar to search input
            expect(queryNumberListItems()).to.be.lessThan(allAnnotationDisplayNames.length);
            expect(getByText("Date created")).to.exist;
            expect(() => getByText("Size")).to.throw();
        });
    });

    describe("Clear All Filters button", () => {
        it("clears all filters", async () => {
            // Arrange
            const { store } = configureMockStore({
                reducer,
                logics: reduxLogics,
                state: mergeState(initialState, {
                    metadata: {
                        annotations: annotationsJson.map(
                            (annotation) => new Annotation(annotation)
                        ),
                    },
                    selection: {
                        filters: [
                            new FileFilter("cell_line", "AICS-0"),
                            new FileFilter("date_created", "01/01/10"),
                        ],
                    },
                }),
            });
            const { getByText } = render(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );
            const button = getByText("CLEAR ALL FILTERS").closest("button");
            if (!button) {
                assert.fail("Could not find 'Clear All Filters' button");
            }

            // (Sanity-check) Ensure the button isn't disabled
            expect(button.disabled).to.be.false;

            // Act
            fireEvent.click(button);

            // Assert
            expect(selection.selectors.getAnnotationFilters(store.getState())).to.be.empty;
        });
    });

    describe("Filtered section of list", () => {
        it("exists when annotations are filtered", () => {
            // Arrange
            const annotations = annotationsJson.map((annotation) => new Annotation(annotation));
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations,
                    },
                    selection: {
                        filters: [new FileFilter("cell_line", "AICS-11")],
                    },
                }),
            });
            const { getByText } = render(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );

            // Assert
            expect(getByText("Filtered")).to.exist;
        });

        it("does not exist when annotations are filtered and search input exists", () => {
            // Arrange
            const annotations = annotationsJson.map((annotation) => new Annotation(annotation));
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations,
                    },
                    selection: {
                        filters: [new FileFilter("cell_line", "AICS-11")],
                    },
                }),
            });
            const { getByText, getByPlaceholderText } = render(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );
            // (sanity-check) bifurcation existed before search
            expect(getByText("Filtered")).to.exist;

            // Act
            fireEvent.change(getByPlaceholderText("Search..."), {
                target: { value: "created" },
            });

            // Assert
            expect(() => getByText("Filtered")).to.throw();
        });

        it("does not exist when no annotations are filtered", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: annotationsJson.map(
                            (annotation) => new Annotation(annotation)
                        ),
                    },
                }),
            });
            const { getByText } = render(
                <Provider store={store}>
                    <DragDropContext
                        onDragEnd={() => {
                            /* noop */
                        }}
                    >
                        <AnnotationList />
                    </DragDropContext>
                </Provider>
            );

            // Assert
            expect(() => getByText("Filtered")).to.throw();
        });
    });

    describe("Dynamic styling", () => {
        [true, false].forEach((shouldDisplaySmallFont) => {
            it(`Has ${
                shouldDisplaySmallFont ? "" : "no"
            } small font style when shouldDisplaySmallFont is ${shouldDisplaySmallFont}`, () => {
                // Arrange
                const { store } = configureMockStore({
                    state: mergeState(initialState, {
                        selection: {
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
                            <AnnotationList />
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
