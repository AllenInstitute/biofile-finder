import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import * as React from "react";
import { fireEvent, render } from "@testing-library/react";
import { Provider } from "react-redux";

import AnnotationFilterForm from "../";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { initialState, reducer, reduxLogics } from "../../../state";

describe("<AnnotationFilterForm />", () => {
    describe("Text annotations", () => {
        // setup
        const fooAnnotation = new Annotation(
            {
                annotationDisplayName: "Foo",
                annotationName: "foo",
                description: "",
                type: "Text",
            },
            ["a", "b", "c", "d", "e"]
        );
        const annotations = [fooAnnotation];

        it("shows all values as unchecked at first", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
            });
            const { store } = configureMockStore({ state });

            const { getAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName="foo" />
                </Provider>
            );

            getAllByRole("listitem").forEach((listItem) => {
                expect(listItem.hasAttribute("checked")).to.equal(false);
            });
        });

        it("deselects and selects a value", async () => {
            // start with the input selected
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, "b")],
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                logics: reduxLogics,
                state,
                reducer,
            });

            const { getByLabelText } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName={fooAnnotation.name} />
                </Provider>
            );

            // assert that the input is selected
            expect(getByLabelText("b").getAttribute("aria-checked")).to.equal("true");

            // deselect the input
            fireEvent.click(getByLabelText("b"));
            await logicMiddleware.whenComplete();

            // assert that the input is deselected
            expect(getByLabelText("b").getAttribute("aria-checked")).to.equal("false");

            // select the input again
            fireEvent.click(getByLabelText("b"));
            await logicMiddleware.whenComplete();

            // assert that the input is selected again
            expect(getByLabelText("b").getAttribute("aria-checked")).to.equal("true");
        });
    });
    describe("Boolean annotations", () => {
        // setup
        const fooAnnotation = new Annotation(
            {
                annotationDisplayName: "Foo",
                annotationName: "foo",
                description: "",
                type: "YesNo",
            },
            [true, false]
        );
        const annotations = [fooAnnotation];

        it("shows all values as unchecked at first", () => {
            // Arrange
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
            });
            const { store } = configureMockStore({ state });
            // Act
            const { getAllByRole } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName="foo" />
                </Provider>
            );
            // Assert
            getAllByRole("listitem").forEach((listItem) => {
                expect(listItem.hasAttribute("checked")).to.equal(false);
            });
        });

        it("deselects and selects a value", async () => {
            // Arrange: Start with the "False" input selected
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, false)],
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                logics: reduxLogics,
                state,
                reducer,
            });
            // Act
            const { getByLabelText } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName={fooAnnotation.name} />
                </Provider>
            );

            // Assert: Check that the "False" input is selected
            expect(getByLabelText("False").getAttribute("aria-checked")).to.equal("true");

            // Act: Deselect the "False" input
            fireEvent.click(getByLabelText("False"));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is deselected
            expect(getByLabelText("False").getAttribute("aria-checked")).to.equal("false");

            // Act: Reselect the "False" input
            fireEvent.click(getByLabelText("False"));
            await logicMiddleware.whenComplete();

            // Assert: Check that the "False" input is selected again
            expect(getByLabelText("False").getAttribute("aria-checked")).to.equal("true");
        });
    });
});
