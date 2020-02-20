import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import * as React from "react";
import { render, within } from "@testing-library/react";
import { Provider } from "react-redux";

import AnnotationFilterForm from "../";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import { initialState } from "../../../state";

describe("<AnnotationFilterForm />", () => {
    describe("Text annotations", () => {
        // setup
        const fooAnnotation = new Annotation({
            annotationDisplayName: "Foo",
            annotationName: "foo",
            description: "",
            type: "Text",
            values: ["a", "b", "c", "d", "e"],
        });
        const annotations = [fooAnnotation];

        it("renders the list of available annotation values to select", () => {
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

            expect(getAllByRole("listitem").length).to.equal(fooAnnotation.values.length);
        });

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

        it("shows a values as checked if it has been selected", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    filters: [new FileFilter(fooAnnotation.name, "b")],
                },
            });
            const { store } = configureMockStore({ state });

            const { getByText } = render(
                <Provider store={store}>
                    <AnnotationFilterForm annotationName="foo" />
                </Provider>
            );

            const selectedListItem = getByText("b");
            const input = within(selectedListItem).getByRole("checkbox");

            expect(input.hasAttribute("checked")).to.equal(true);
        });
    });
});
