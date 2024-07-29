import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import Modal, { ModalType } from "../..";
import { initialState, interaction, reduxLogics } from "../../../../state";

describe("<SmallScreenWarning />", () => {
    const baseUrl = "test";
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
            visibleModal: ModalType.SmallScreenWarning,
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
        expect(getByText("This app is not optimized for use on small screens.")).to.exist;
    });

    it("contains checkbox to dismiss for duration of session", async () => {
        // Arrange
        const { store, logicMiddleware, actions } = configureMockStore({
            state: visibleDialogState,
            logics: reduxLogics,
        });

        const { findByText, findByRole } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        // Act
        const checkbox = await findByRole("checkbox");
        fireEvent.click(checkbox);
        await logicMiddleware.whenComplete();

        const closeButton = await findByText("OK");
        fireEvent.click(closeButton);
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch({
                type: interaction.actions.MARK_AS_DISMISSED_SMALL_SCREEN_WARNING,
            })
        ).to.be.true;
    });
});
