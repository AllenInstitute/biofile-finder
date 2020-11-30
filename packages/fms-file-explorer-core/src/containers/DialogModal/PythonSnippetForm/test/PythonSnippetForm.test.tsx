import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import DialogModal, { Modal } from "../..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../../constants";
import Annotation from "../../../../entity/Annotation";
import { initialState } from "../../../../state";
import { GENERATE_PYTHON_SNIPPET, SET_CSV_COLUMNS } from "../../../../state/interaction/actions";

describe("<PythonSnippetForm />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: Modal.PythonSnippetForm,
        },
    });

    it("is visible when should not be hidden", async () => {
        // Arrange
        const { store } = configureMockStore({ state: visibleDialogState });
        const { getByText } = render(
            <Provider store={store}>
                <DialogModal />
            </Provider>
        );

        // Assert
        expect(getByText("Generate Python Snippet")).to.exist;
    });

    describe("generate button", () => {
        it("dispatches generation and persistence events when clicked", async () => {
            // Arrange
            const { actions, store } = configureMockStore({ state: visibleDialogState });
            const { getByText, getByPlaceholderText } = render(
                <Provider store={store}>
                    <DialogModal />
                </Provider>
            );
            const dataset = "My Cool Dataset";

            // Act
            const datasetNameInput = getByPlaceholderText("Enter Dataset Name...");
            fireEvent.change(datasetNameInput, { target: { value: dataset } });

            const generateButton = getByText("Generate");
            fireEvent.click(generateButton);

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_CSV_COLUMNS,
                    payload: TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.displayName),
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: GENERATE_PYTHON_SNIPPET,
                    payload: {
                        dataset,
                        annotations: TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.name),
                    },
                })
            ).to.be.true;
        });

        it("is disabled when no name is selected for dataset", () => {
            // Arrange
            const { actions, store } = configureMockStore({ state: visibleDialogState });
            const { getByText, getByTestId } = render(
                <Provider store={store}>
                    <DialogModal />
                </Provider>
            );

            // Act
            const datasetOption = getByText("Dataset");
            fireEvent.click(datasetOption);

            const generateButton = getByText("Generate");
            fireEvent.click(generateButton);

            // Assert
            expect(() => getByTestId("python-snippet-loading-icon")).to.throw();
            expect(
                actions.includesMatch({
                    type: SET_CSV_COLUMNS,
                })
            ).to.be.false;
            expect(
                actions.includesMatch({
                    type: GENERATE_PYTHON_SNIPPET,
                })
            ).to.be.false;
        });
    });

    describe("column list", () => {
        it("has default columns when none were previousuly saved", async () => {
            // Arrange
            const { store } = configureMockStore({ state: visibleDialogState });
            const { getByText } = render(
                <Provider store={store}>
                    <DialogModal />
                </Provider>
            );

            // Assert
            TOP_LEVEL_FILE_ANNOTATIONS.forEach((annotation) => {
                expect(getByText(annotation.displayName)).to.exist;
            });
        });

        it("has pre-saved columns when some were previousuly saved", async () => {
            // Arrange
            const preSavedColumns = ["Cas9", "Cell Line", "Donor Plasmid"];
            const state = mergeState(visibleDialogState, {
                interaction: {
                    csvColumns: preSavedColumns,
                },
                metadata: {
                    annotations: preSavedColumns.map(
                        (c) =>
                            new Annotation({
                                annotationDisplayName: c,
                                annotationName: c,
                                description: "test",
                                type: "text",
                            })
                    ),
                },
            });
            const { store } = configureMockStore({ state });
            const { getByText } = render(
                <Provider store={store}>
                    <DialogModal />
                </Provider>
            );

            // Assert
            preSavedColumns.forEach((value) => {
                expect(getByText(value)).to.exist;
            });
        });
    });
});
