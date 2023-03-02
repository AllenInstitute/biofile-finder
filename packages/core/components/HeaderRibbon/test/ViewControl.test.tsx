import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { RELATIVE_DATE_RANGES } from "../../../constants";

import { initialState, selection } from "../../../state";
import ViewControl from "../ViewControl";

describe("<ViewControl />", () => {
    it("displays 'Search...' as placeholder", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getByPlaceholderText } = render(
            <Provider store={store}>
                <ViewControl />
            </Provider>
        );

        // Act / Assert
        expect(getByPlaceholderText("Search...")).to.exist;
    });

    it("changes view when one is selected", () => {
        // Arrange
        const viewToSelect = RELATIVE_DATE_RANGES[0].name;
        const { actions, store } = configureMockStore({
            state: initialState,
        });
        const { getByText, getByPlaceholderText } = render(
            <Provider store={store}>
                <ViewControl />
            </Provider>
        );

        // Act
        fireEvent.click(getByPlaceholderText("Search..."));
        fireEvent.click(getByText(viewToSelect));

        // Assert
        expect(actions.includesMatch(selection.actions.changeView(viewToSelect))).to.be.true;
    });
});
