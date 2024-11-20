import { configureMockStore } from "@aics/redux-utils";
import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import Query from "../Query";
import { initialState } from "../../../state";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../../constants";

describe("<Query />", () => {
    it("expands and collapses when clicked", async () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });
        const sourceName = "Test Source";
        const { getByTestId } = render(
            <Provider store={store}>
                <Query
                    isSelected
                    query={{
                        name: "Test Random Query",
                        parts: {
                            filters: [],
                            hierarchy: [],
                            sources: [{ name: sourceName }],
                            openFolders: [],
                        },
                    }}
                />
            </Provider>
        );

        // (sanity-check) is collapsed
        expect(getByTestId("expand-button")).to.exist;
        expect(() => getByTestId("collapse-button")).to.throw();

        // Act
        fireEvent.click(getByTestId("expand-button"));

        // Assert
        expect(getByTestId("collapse-button")).to.exist;
        expect(() => getByTestId("expand-button")).to.throw();
    });

    it("renders spinner when loading", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });

        // Act
        const { getByTestId } = render(
            <Provider store={store}>
                <Query
                    isSelected
                    query={{
                        name: AICS_FMS_DATA_SOURCE_NAME,
                        parts: {
                            filters: [],
                            hierarchy: [],
                            sources: [],
                            openFolders: [],
                        },
                    }}
                />
            </Provider>
        );

        // Assert
        expect(getByTestId("query-spinner")).to.exist;
    });

    it("does not render spinner when not loading", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });

        // Act
        const { getByTestId } = render(
            <Provider store={store}>
                <Query
                    isSelected
                    query={{
                        name: "Test Random Query",
                        parts: {
                            filters: [],
                            hierarchy: [],
                            sources: [{ name: "Test Source" }],
                            openFolders: [],
                        },
                    }}
                />
            </Provider>
        );

        // Assert
        expect(() => getByTestId("query-spinner")).to.throw();
    });
});
