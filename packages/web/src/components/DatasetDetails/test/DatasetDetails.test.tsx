import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { get as _get } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import DatasetDetails from "../";
import PublicDataset, { DATASET_DISPLAY_FIELDS } from "../../../entity/PublicDataset";
import { makePublicDatasetMock } from "../../../entity/PublicDataset/mocks";
import { initialState, selection } from "../../../../../core/state";
import DatabaseServiceNoop from "../../../../../core/services/DatabaseService/DatabaseServiceNoop";

describe("<DatasetDetails />", () => {
    describe("render", () => {
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetDetails />,
            },
        ]);
        it("renders correct dataset field names and values for a fully defined dataset", () => {
            const mockDataset = makePublicDatasetMock("test-id");

            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                        selectedPublicDataset: mockDataset,
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
                const value = _get(mockDataset.details, field.name);
                expect(queryByText(field.displayLabel)).to.exist;
                expect(queryByText(value)).to.exist;
            });
        });
        it("renders title and description", () => {
            const mockDataset = makePublicDatasetMock("test-id");

            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                        selectedPublicDataset: mockDataset,
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
        it("displays indicator for undefined fields", () => {
            const sparseDataset = new PublicDataset({
                dataset_name: "Sparse Dataset",
                dataset_size: "100",
            });

            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                        selectedPublicDataset: sparseDataset,
                    },
                }),
            });
            const { getAllByText } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            const undefinedFieldCount = DATASET_DISPLAY_FIELDS.length - 1;
            expect(getAllByText("--").length).to.equal(undefinedFieldCount);
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
    describe("loadDataset", () => {
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetDetails />,
            },
            {
                path: "/app",
                element: <></>,
            },
        ]);
        it("calls dispatch", () => {
            const mockDataset = makePublicDatasetMock("test-id");

            // Arrange
            const { store, actions } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        isOnWeb: true,
                        platformDependentServices: {
                            databaseService: new DatabaseServiceNoop(),
                        },
                        selectedPublicDataset: mockDataset,
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
