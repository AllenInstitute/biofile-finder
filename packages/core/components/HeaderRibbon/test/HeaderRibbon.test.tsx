import { configureMockStore } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import HeaderRibbon from "..";
import { initialState } from "../../../state";

describe("<HeaderRibbon />", () => {
    it("renders collection name in header", () => {
        // Arrange
        const name = "Assay Dev Collection";
        const mockCollection = {
            id: "212313",
            name,
            version: 1,
        };
        const { store } = configureMockStore({
            state: {
                ...initialState,
                metadata: {
                    ...initialState.metadata,
                    collections: [mockCollection],
                },
                selection: {
                    ...initialState.selection,
                    collectionId: mockCollection.id,
                },
            },
        });
        const { getByText } = render(
            <Provider store={store}>
                <HeaderRibbon />
            </Provider>
        );

        // Assert
        expect(getByText(`Collection (${name})`)).to.exist;
    });
});
