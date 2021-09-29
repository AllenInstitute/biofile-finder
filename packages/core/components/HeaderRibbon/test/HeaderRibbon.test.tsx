import { configureMockStore } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import HeaderRibbon from "..";
import { initialState } from "../../../state";
import { getCollectionId } from "../../../state/selection/selectors";

describe("<HeaderRibbon />", () => {
    it("collapses & expands", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });
        const { getByText } = render(
            <Provider store={store}>
                <HeaderRibbon />
            </Provider>
        );

        // (sanity-check) is collapsed
        expect(getByText("Is Fixed")).to.not.exist;

        // Act / Assert
        const collectionHeader = getByText("Collection");
        fireEvent.click(collectionHeader);
        expect(getByText("Is Fixed")).to.exist;
        fireEvent.click(collectionHeader);
        expect(getByText("Is Fixed")).to.not.exist;
    });

    it("renders collection name when collapsed", () => {
        // Arrange
        const collectionId = "123123";
        const name = "Assay Dev Collection";
        const { store } = configureMockStore({
            state: {
                ...initialState,
                metadata: {
                    ...initialState.metadata,
                    collections: [
                        {
                            id: getCollectionId,
                            name,
                            version: 1,
                        },
                    ],
                },
                selection: {
                    ...initialState.selection,
                    collectionId,
                },
            },
        });
        const { getByText } = render(
            <Provider store={store}>
                <HeaderRibbon />
            </Provider>
        );

        // Assert
        expect(getByText(name)).to.exist;
    });
});
