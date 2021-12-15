import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import ContextMenu, { ContextMenuItem } from "..";
import { initialState, interaction, reducer } from "../../../state";

describe("<ContextMenu />", () => {
    const items: ContextMenuItem[] = [
        {
            key: "foo",
            text: "Foo",
        },
        {
            key: "bar",
            text: "Bar",
        },
    ];

    it("changes store state to hide itself onDismiss", async () => {
        // Arrange
        const state = mergeState(initialState, {
            interaction: {
                contextMenuIsVisible: true,
                contextMenuItems: items,
            },
        });
        const { store } = configureMockStore({ state, reducer });
        const { findByText } = render(
            <Provider store={store}>
                <ContextMenu />
            </Provider>
        );

        // Act: clicking an item in the context menu triggers the onDismiss code path
        fireEvent.click(await findByText("Foo"));

        // Assert
        expect(interaction.selectors.getContextMenuVisibility(store.getState())).to.equal(false);
    });

    it("toggles the visibily of the underlying context menu according to corresponding application state", () => {
        // Arrange
        const state = mergeState(initialState, {
            interaction: {
                contextMenuIsVisible: false,
            },
        });
        const { store } = configureMockStore({ state, reducer });
        const { queryByText } = render(
            <Provider store={store}>
                <ContextMenu />
            </Provider>
        );

        // initially, expect context menu to be hidden
        expect(queryByText("Foo")).to.equal(null);

        // Act: change state
        store.dispatch(interaction.actions.showContextMenu(items, ".foo"));

        // Assert: should be visible now
        expect(queryByText("Foo")).to.not.equal(null);
    });
});
