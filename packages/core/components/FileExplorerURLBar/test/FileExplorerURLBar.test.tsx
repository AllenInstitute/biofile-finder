import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState, interaction } from "../../../state";

import FileExplorerURLBar from "../";

describe("<FileExplorerURLBar />", () => {
    describe("refresh", () => {
        it("resets URL bar", () => {
            // Arrange
            const { store } = configureMockStore({ state: initialState });
            const { getByTestId } = render(
                <Provider store={store}>
                    <FileExplorerURLBar />
                </Provider>
            );
            const refreshButton = getByTestId("refresh-button");

            // Modify URL bar
            const urlBar = getByTestId("fms-file-explorer-url-bar") as HTMLInputElement;
            const originalURL = urlBar.value;
            const updatedURL = "fms-file-explorer://unknown-link";
            fireEvent.change(urlBar, { target: { value: updatedURL } });

            // (sanity-check) ensure url bar is modified
            expect(urlBar.value).to.be.equal(updatedURL);

            // Act
            fireEvent.click(refreshButton);

            // Assert
            expect(urlBar.value).to.be.equal(originalURL);
        });

        it("dispatches refresh event", () => {
            // Arrange
            const { store, actions } = configureMockStore({ state: initialState });
            const { getByTestId } = render(
                <Provider store={store}>
                    <FileExplorerURLBar />
                </Provider>
            );
            const refreshButton = getByTestId("refresh-button");

            // Act
            fireEvent.click(refreshButton);

            // Assert
            expect(
                actions.includesMatch({
                    type: interaction.actions.REFRESH,
                })
            );
        });
    });
});
