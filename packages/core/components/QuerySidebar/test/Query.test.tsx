import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";

import Query from "../Query";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../../constants";
import FileFilter from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import ExcludeFilter from "../../../entity/FileFilter/ExcludeFilter";
import { initialState } from "../../../state";

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

    it("renders spinner when loading an FMS source", () => {
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

    it("renders spinner when loading an external source", () => {
        // Arrange
        const { store } = configureMockStore({
            state: initialState,
        });
        Object.defineProperty(window, "location", {
            value: {
                search: "mock-query-param=true",
                assign: noop,
            },
        });

        // Act
        const { getByTestId } = render(
            <Provider store={store}>
                <Query
                    isSelected
                    query={{
                        name: "Test Data Source",
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

    it("does not render spinner if there's a data source error", () => {
        // Arrange
        const state = mergeState(initialState, {
            selection: {
                requiresDataSourceReload: true,
            },
        });
        const { store } = configureMockStore({
            state,
        });

        Object.defineProperty(window, "location", {
            value: {
                search: "mock-query-param=true",
                assign: noop,
            },
        });

        // Act
        const { getByTestId } = render(
            <Provider store={store}>
                <Query
                    isSelected
                    query={{
                        name: "Test Failing Source",
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
        expect(() => getByTestId("query-spinner")).to.throw();
    });

    describe("displays condensed list of filters when collapsed", () => {
        it("gives a count of values for regular filters", () => {
            // Arrange
            const { store } = configureMockStore({
                state: initialState,
            });
            const multiValueFilterName = "Colors";
            const multiValueList = ["red", "blue", "green"];
            const filters = multiValueList.map(
                (color) => new FileFilter(multiValueFilterName, color)
            );

            // Act
            const { getByText } = render(
                <Provider store={store}>
                    <Query
                        isSelected={false}
                        query={{
                            name: "Test Random Query",
                            parts: {
                                filters,
                                hierarchy: [],
                                sources: [{ name: "Test Source" }],
                                openFolders: [],
                            },
                        }}
                    />
                </Provider>
            );

            // Assert
            expect(getByText(new RegExp(multiValueFilterName))).to.exist;
            expect(getByText(new RegExp(`\\(${multiValueList.length}\\)`))).to.exist; // '(3)'
        });

        it("does not show details for range filters", () => {
            // Arrange
            const { store } = configureMockStore({
                state: initialState,
            });
            const rangeFilterName = "Uploaded";
            const filters = [
                new FileFilter(rangeFilterName, `RANGE(${new Date(0)},${new Date()})`),
            ];

            // Act
            const { getByText } = render(
                <Provider store={store}>
                    <Query
                        isSelected={false}
                        query={{
                            name: "Test Random Query",
                            parts: {
                                filters,
                                hierarchy: [],
                                sources: [{ name: "Test Source" }],
                                openFolders: [],
                            },
                        }}
                    />
                </Provider>
            );

            // Assert
            expect(getByText(new RegExp(rangeFilterName))).to.exist;
            expect(() => getByText(new RegExp(`${rangeFilterName} \\(`))).to.throw();
            expect(() => getByText(/RANGE/)).to.throw();
        });

        it("shows description instead of count for special filter types", () => {
            // Arrange
            const { store } = configureMockStore({
                state: initialState,
            });
            const includeFilterName = "Filter A";
            const excludeFilterName = "Filter B";
            const filters = [
                new IncludeFilter(includeFilterName),
                new ExcludeFilter(excludeFilterName),
            ];

            // Act
            const { getByText } = render(
                <Provider store={store}>
                    <Query
                        isSelected={false}
                        query={{
                            name: "Test Random Query",
                            parts: {
                                filters,
                                hierarchy: [],
                                sources: [{ name: "Test Source" }],
                                openFolders: [],
                            },
                        }}
                    />
                </Provider>
            );

            // Assert
            expect(getByText(new RegExp(`${includeFilterName} \\(Any value\\)`))).to.exist;
            expect(getByText(new RegExp(`${excludeFilterName} \\(No value\\)`))).to.exist;
        });
    });
});
