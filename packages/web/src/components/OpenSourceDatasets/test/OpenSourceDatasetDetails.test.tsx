import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { get as _get, noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { spy } from "sinon";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import DatasetDetails from "../OpenSourceDatasetDetails";
import PublicDataset, { DATASET_DISPLAY_FIELDS } from "../../../entity/PublicDataset";
import { makePublicDatasetMock } from "../../../entity/PublicDataset/mocks";
import { initialState } from "../../../../../core/state";
import DatabaseServiceNoop from "../../../../../core/services/DatabaseService/DatabaseServiceNoop";

describe("<OpenSourceDatasetDetails />", () => {
    describe("render", () => {
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetDetails onLoadDataset={noop} />,
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
        it("renders links for ref publication and DOI if provided", () => {
            const mockDataset = makePublicDatasetMock("test-id");

            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        selectedPublicDataset: mockDataset,
                    },
                }),
            });
            const { getAllByRole } = render(
                <Provider store={store}>
                    <RouterProvider router={mockRouter} />
                </Provider>
            );

            expect(getAllByRole("link").length).to.equal(3);
            expect(getAllByRole("link").at(1)?.getAttribute("href")).to.equal(
                mockDataset.details.doi
            );
        });
        it("displays indicator for undefined fields", () => {
            const sparseDataset = new PublicDataset({
                dataset_name: "Sparse Dataset",
                dataset_size: "100",
                dataset_path: "anything",
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
    });
    describe("loadDataset", () => {
        const onLoadDataset = spy();
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetDetails onLoadDataset={onLoadDataset} />,
            },
        ]);
        it("calls loadDataset with data", () => {
            const mockDataset = makePublicDatasetMock("test-id");

            // Arrange
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
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
            expect(getByLabelText(/^View/)).to.exist;
            expect(onLoadDataset.called).to.equal(false);

            // Act
            fireEvent.click(getByLabelText(/^View/));

            // Assert
            expect(onLoadDataset.called).to.equal(true);
            expect(onLoadDataset.getCalls()[0].args).to.contain(mockDataset);
        });
    });
});
