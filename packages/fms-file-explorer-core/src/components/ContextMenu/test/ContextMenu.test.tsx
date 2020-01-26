import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { mount } from "enzyme";
import { ContextualMenu } from "office-ui-fabric-react";
import * as React from "react";
import { Provider } from "react-redux";

import ContextMenu from "../";
import { initialState, interaction, reducer } from "../../../state";

describe("<ContextMenu />", () => {
    const items = [
        {
            key: "foo",
            text: "Foo",
        },
        {
            key: "bar",
            text: "Bar",
        },
    ];

    it("changes store state to hide itself onDismiss", () => {
        const state = mergeState(initialState, {
            interaction: {
                contextMenuIsVisible: true,
            },
        });
        const { store } = configureMockStore({ state, reducer });
        const wrapper = mount(
            <Provider store={store}>
                <ContextMenu items={items} />
            </Provider>
        );

        // clicking an item in the context menu triggers the onDismiss code path
        wrapper
            .findWhere((node) => node.type() === "button" && node.text() === "Foo")
            .simulate("click");

        expect(interaction.selectors.getContextMenuVisibility(store.getState())).to.equal(false);
    });

    describe("facade", () => {
        it("toggles the visibily of the underlying context menu according to corresponding application state", () => {
            const state = mergeState(initialState, {
                interaction: {
                    contextMenuIsVisible: false,
                },
            });
            const { store } = configureMockStore({ state, reducer });
            const wrapper = mount(
                <Provider store={store}>
                    <ContextMenu items={items} />
                </Provider>
            );

            const getUnderlyingContextualMenu = () => wrapper.find(ContextualMenu);

            // initially, expect context menu to be hidden
            expect(getUnderlyingContextualMenu().prop("hidden")).to.equal(true);

            // change state
            store.dispatch(interaction.actions.showContextMenu([]));
            wrapper.update();

            // should be visible now
            expect(getUnderlyingContextualMenu().prop("hidden")).to.equal(false);
        });
    });
});
