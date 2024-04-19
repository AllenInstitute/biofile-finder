import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import Modal, { ModalType } from "../..";
import { initialState } from "../../../../state";

describe("<PythonSnippet />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: ModalType.PythonSnippet,
        },
    });

    it("is visible when should not be hidden", () => {
        // Arrange
        const { store } = configureMockStore({ state: visibleDialogState });
        const { getByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        // Assert
        expect(getByText("Setup")).to.exist;
        expect(getByText("Code")).to.exist;
    });

    it("displays snippet when present in state", async () => {
        // Arrange
        const setup = "pip install aicsfiles";
        const code = "my_files = querier.query()";
        const { store } = configureMockStore({ state: visibleDialogState });
        const { findByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        // Assert
        expect(await findByText(setup)).to.exist;
        expect(await findByText(code)).to.exist;
    });
});
