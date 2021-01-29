import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import React from "react";
import { Provider } from "react-redux";

import FileFilter from "../../../entity/FileFilter";
import { initialState, reducer, reduxLogics } from "../../../state";

import FilterDisplayBar from "../";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

describe("<FilterDisplayBar />", () => {
    it("renders a medallion for each annotation represented in application state file filters", async () => {
        // Arrange
        const state = mergeState(initialState, {
            metadata: {
                annotations: [
                    new Annotation({
                        annotationDisplayName: "Cell Line",
                        annotationName: "Cell Line",
                        description: "Blah blah blah",
                        type: AnnotationType.STRING,
                    }),
                    new Annotation({
                        annotationDisplayName: "Workflow",
                        annotationName: "Workflow",
                        description: "Blah blah blah",
                        type: AnnotationType.STRING,
                    }),
                ],
            },
            selection: {
                filters: [
                    new FileFilter("Cell Line", "Foo"),
                    new FileFilter("Cell Line", "Bar"),
                    new FileFilter("Cell Line", "Baz"),
                    new FileFilter("Workflow", "R&D"),
                ],
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { findAllByText } = render(
            <Provider store={store}>
                <FilterDisplayBar />
            </Provider>
        );

        // Assert
        expect((await findAllByText(/^Cell Line/)).length).to.equal(1);
        expect((await findAllByText(/^Workflow/)).length).to.equal(1);
    });

    it("uses EQUALS when only one filter is set for an annotation and ONE OF when multiple are", async () => {
        // Arrange
        const state = mergeState(initialState, {
            metadata: {
                annotations: [
                    new Annotation({
                        annotationDisplayName: "Cell Line",
                        annotationName: "Cell Line",
                        description: "Blah blah blah",
                        type: AnnotationType.STRING,
                    }),
                    new Annotation({
                        annotationDisplayName: "Workflow",
                        annotationName: "Workflow",
                        description: "Blah blah blah",
                        type: AnnotationType.STRING,
                    }),
                ],
            },
            selection: {
                filters: [
                    new FileFilter("Cell Line", "Foo"),
                    new FileFilter("Cell Line", "Bar"),
                    new FileFilter("Cell Line", "Baz"),
                    new FileFilter("Workflow", "R&D"),
                ],
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { findByText } = render(
            <Provider store={store}>
                <FilterDisplayBar />
            </Provider>
        );

        // Assert
        expect(await findByText("Cell Line ONE OF Foo, Bar, Baz")).to.exist;
        expect(await findByText("Workflow EQUALS R&D")).to.exist;
    });

    it("clears all file filters related to the annotation when the 'close' icon is pressed", async () => {
        // Arrange
        const state = mergeState(initialState, {
            metadata: {
                annotations: [
                    new Annotation({
                        annotationDisplayName: "Cell Line",
                        annotationName: "Cell Line",
                        description: "Blah blah blah",
                        type: AnnotationType.STRING,
                    }),
                ],
            },
            selection: {
                filters: [
                    new FileFilter("Cell Line", "Foo"),
                    new FileFilter("Cell Line", "Bar"),
                    new FileFilter("Cell Line", "Baz"),
                ],
            },
        });
        const { store } = configureMockStore({
            state,
            reducer,
            logics: reduxLogics,
        });

        // Act
        const { findByText, findByRole, getByText } = render(
            <Provider store={store}>
                <FilterDisplayBar />
            </Provider>
        );

        // Assert
        // now you see it
        expect(await findByText(/^Cell Line/)).to.exist;

        // now you don't
        const clearButton = await findByRole("button", { exact: false, name: "Clear" });
        fireEvent.click(clearButton);
        expect(() => getByText(/^Cell Line/)).to.throw;
    });

    it("presents the display value of a filter", async () => {
        // Arrange
        const state = mergeState(initialState, {
            metadata: {
                annotations: [
                    new Annotation({
                        annotationDisplayName: "Timelapse Interval",
                        annotationName: "Timelapse Interval",
                        description: "Blah blah blah",
                        type: AnnotationType.DURATION,
                    }),
                ],
            },
            selection: {
                filters: [
                    new FileFilter("Timelapse Interval", 10000), // in milliseconds, 10 * 1000ms = 10s
                ],
            },
        });
        const { store } = configureMockStore({ state });

        // Act
        const { findByText } = render(
            <Provider store={store}>
                <FilterDisplayBar />
            </Provider>
        );

        // Assert
        expect(await findByText("Timelapse Interval EQUALS 10S")).to.exist;
    });
});
