import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { initialState } from "../../../state";

import FileThumbnail from "..";

describe("<FileThumbnail />", () => {
    it("renders thumbnail one if one specified", () => {
        // Arrange
        const state = mergeState(initialState, {});
        const { store } = configureMockStore({ state });

        // Act
        const { getByRole } = render(
            <Provider store={store}>
                <FileThumbnail uri={"some/path/to/my_image0.jpg"} />
            </Provider>
        );

        // Assert
        const thumbnail = getByRole("img");
        expect(thumbnail.getAttribute("src")).to.include("some/path/to/my_image0.jpg");
    });

    it("renders svg as thumbnail if no URI is specified", () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });

        // Act
        const { queryByRole } = render(
            <Provider store={store}>
                <FileThumbnail />
            </Provider>
        );

        // Assert
        expect(".no-thumbnail").to.exist;
        expect(".svg").to.exist;
        expect(queryByRole("img")).not.to.exist;
    });
});
