import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { get as _get, noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { initialState, selection } from "../../../../../core/state";
import DatabaseServiceNoop from "../../../../../core/services/DatabaseService/DatabaseServiceNoop";
import { DataSource } from "../../../../../core/services/DataSourceService";

import DatasetDetails, { DATASET_DISPLAY_FIELDS } from "../";

describe("<DatasetDetails />", () => {
    const mockDescriptionShort = "This is a string that has 40 characters.";
    const mockDataset: DataSource = {
        id: "blah",
        size: "1",
        count: "4",
        name: "Mock Dataset",
        version: "134",
        creationDate: "2021-01-01",
        description: mockDescriptionShort,
        source: "test",
    };

    describe("render", () => {
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetDetails dataset={mockDataset} onDismiss={noop} />,
            },
        ]);
        it("renders correct dataset field names and values for a fully defined dataset", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                    },
                }),
            });
            const { queryByText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            // Act / Assert
            DATASET_DISPLAY_FIELDS.forEach((field) => {
                const value = _get(mockDataset, field.key);
                expect(queryByText(field.display)).to.exist;
                expect(queryByText(value as string)).to.exist;
            });
        });
        it("renders title and description", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                    },
                }),
            });
            const { getByText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            expect(getByText(mockDataset.name)).to.exist;
            expect(getByText(mockDataset.description)).to.exist;
        });
        it("renders links for ref publication and DOI if provided", () => {
            // Arrange
            const { store } = configureMockStore({
                state: initialState,
            });
            const { getAllByRole } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            expect(getAllByRole("link").length).to.equal(2);
            expect(getAllByRole("link").at(0)?.getAttribute("href")).to.equal(mockDataset.doi);
        });
        it("displays indicator for undefined fields", () => {
            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                    },
                }),
            });
            const { getAllByText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            expect(getAllByText("--").length).to.equal(1);
        });
        it("provides two different close buttons", () => {
            // Arrange
            const { store } = configureMockStore({
                state: initialState,
            });
            const { getAllByLabelText, getAllByRole } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );
            expect(getAllByRole("button").length).to.equal(3);
            expect(getAllByLabelText(/Close/).length).to.equal(2);
        });
    });
    describe("show/hide full description", () => {
        it("hides the read more/less buttons for short descriptions", () => {
            // Arrange
            const mockRouter = createBrowserRouter([
                {
                    path: "/",
                    element: <DatasetDetails dataset={mockDataset} onDismiss={noop} />,
                },
            ]);

            const { store } = configureMockStore({
                state: initialState,
            });
            const { getByText, queryByText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            // Act/Assert
            expect(getByText(mockDescriptionShort)).to.exist;
            expect(queryByText("Read more")).not.to.exist;
            expect(queryByText("Read less")).not.to.exist;
        });

        it("renders the read more button for long descriptions", () => {
            // Arrange
            const mockDescriptionLong = mockDescriptionShort.repeat(10);
            const mockRouter = createBrowserRouter([
                {
                    path: "/",
                    element: (
                        <DatasetDetails
                            dataset={{ ...mockDataset, description: mockDescriptionLong }}
                            onDismiss={noop}
                        />
                    ),
                },
            ]);

            const { store } = configureMockStore({
                state: initialState,
            });
            const { getByText, queryByText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            // Act/Assert
            expect(getByText(new RegExp(mockDescriptionShort, "i"))).to.exist;
            expect(queryByText("Read more")).to.exist;
            expect(queryByText("Read less")).not.to.exist;
        });

        it("renders only the read less button on click", async () => {
            // Arrange
            const mockDescriptionLong = mockDescriptionShort.repeat(10);
            const mockRouter = createBrowserRouter([
                {
                    path: "/",
                    element: (
                        <DatasetDetails
                            dataset={{ ...mockDataset, description: mockDescriptionLong }}
                            onDismiss={noop}
                        />
                    ),
                },
            ]);

            const { store } = configureMockStore({
                state: initialState,
            });
            const { getByText, findByText, queryByText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            // Act
            fireEvent.click(getByText("Read more"));

            // Assert
            expect(await findByText("Read less")).to.exist;
            expect(queryByText("Read more")).not.to.exist;
        });
    });
    describe("loadDataset", () => {
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetDetails dataset={mockDataset} onDismiss={noop} />,
            },
            {
                path: "/app",
                element: <></>,
            },
        ]);
        it("calls dispatch", () => {
            // Arrange
            const { store, actions } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                    },
                }),
            });
            const { getByLabelText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            // consistency checks, button exists & no actions fired
            expect(getByLabelText("Load dataset")).to.exist;
            expect(actions.list.length).to.equal(0);

            // Act
            fireEvent.click(getByLabelText("Load dataset"));

            // Assert
            expect(actions.list.length).to.equal(1);
            expect(
                actions.includesMatch({
                    type: selection.actions.ADD_QUERY,
                })
            ).to.equal(true);
        });
    });
});
