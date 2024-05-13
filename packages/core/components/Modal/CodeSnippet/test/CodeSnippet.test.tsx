import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render, screen } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import Modal, { ModalType } from "../..";
import { initialState } from "../../../../state";

describe("<CodeSnippet />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: ModalType.CodeSnippet,
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
        const setup = /pip install (")?pandas/;
        const code = "#No options selected";
        const { store } = configureMockStore({ state: visibleDialogState });
        const { findByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        // Assert
        expect(screen.findByText((_, element) => element?.textContent?.match(setup) !== null)).to
            .exist;
        expect(await findByText(code)).to.exist;
    });
});
