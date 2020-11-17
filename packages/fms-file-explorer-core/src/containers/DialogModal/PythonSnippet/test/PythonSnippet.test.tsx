import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import DialogModal, { Modal } from "../..";
import { initialState } from "../../../../state";

describe("<PythonSnippet />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: Modal.PythonSnippet,
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
        expect(getByText("Setup")).to.exist;
        expect(getByText("Code")).to.exist;
    });

    it("displays snippet when present in state", async () => {
        // Arrange
        const pythonSnippet = "1234091234";
        const state = mergeState(visibleDialogState, {
            interaction: {
                pythonSnippet,
            },
        });
        const { store } = configureMockStore({ state });
        const { findByText } = render(
            <Provider store={store}>
                <DialogModal />
            </Provider>
        );

        // Assert
        expect(await findByText(pythonSnippet)).to.exist;
    });
});
