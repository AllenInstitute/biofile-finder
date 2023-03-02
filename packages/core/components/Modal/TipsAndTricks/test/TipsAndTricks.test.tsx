import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import Modal, { ModalType } from "../..";
import { initialState } from "../../../../state";

describe("<TipsAndTricks />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: ModalType.TipsAndTricks,
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
        expect(getByText("Performance")).to.exist;
    });
});
