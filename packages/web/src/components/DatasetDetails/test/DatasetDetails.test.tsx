import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { get as _get, noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { spy } from "sinon";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import DatasetDetails from "../";
import PublicDataset, { DATASET_DISPLAY_FIELDS } from "../../../entity/PublicDataset";
import { makePublicDatasetMock } from "../../../entity/PublicDataset/mocks";
import { initialState } from "../../../../../core/state";
import DatabaseServiceNoop from "../../../../../core/services/DatabaseService/DatabaseServiceNoop";

describe("<DatasetDetails />", () => {
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
    describe("show/hide full description", () => {
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetDetails onLoadDataset={noop} />,
            },
        ]);
        const mockDescriptionShort = "This is a string that has 40 characters.";

        it("hides the read more/less buttons for short descriptions", () => {
            // Arrange
            const mockDataset = new PublicDataset({
                dataset_name: "Mock Dataset",
                description: mockDescriptionShort,
            });

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        selectedPublicDataset: mockDataset,
                    },
                }),
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
            const mockDataset = new PublicDataset({
                dataset_name: "Mock Dataset",
                description: mockDescriptionLong,
            });

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        selectedPublicDataset: mockDataset,
                    },
                }),
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
            const mockDataset = new PublicDataset({
                dataset_name: "Mock Dataset",
                description: mockDescriptionLong,
            });

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        selectedPublicDataset: mockDataset,
                    },
                }),
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
