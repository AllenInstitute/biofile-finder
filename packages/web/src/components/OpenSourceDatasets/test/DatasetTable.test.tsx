import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { createSandbox } from "sinon";

import { DatasetColumns } from "../DatasetColumns";
import DatasetTable from "../DatasetTable";
import * as useDatasetDetails from "../useDatasetDetails";
import { makePublicDatasetMock } from "../../../entity/PublicDataset/mocks";
import { initialState } from "../../../../../core/state";
import DatabaseFileService from "../../../../../core/services/FileService/DatabaseFileService";

describe("<DatasetTable />", () => {
    const sandbox = createSandbox();
    const mockRouter = createBrowserRouter([
        {
            path: "/",
            element: <DatasetTable />,
        },
        {
            path: "/app",
            element: <></>,
        },
    ]);
    const mockIdList = ["abc123", "def456", "ghi789"];
    const mockDatasetList = mockIdList.map((id) => makePublicDatasetMock(id));

    const { store } = configureMockStore({
        state: mergeState(initialState, {
            interaction: {
                isOnWeb: true,
            },
        }),
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("displays 'No files found' message when no files found", async () => {
        // Arrange
        const fileService = new DatabaseFileService();
        sandbox.replace(fileService, "getCountOfMatchingFiles", () => Promise.resolve(0));

        const { findByText } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act / Assert
        // Wait for the fileService call to return, then check for updated list length display
        await findByText("No datasets found");
    });

    it("displays error messages", async () => {
        // Arrange
        sandbox
            .stub(useDatasetDetails, "default")
            .callsFake(() => [mockDatasetList, false, "This is a test error"]);

        const { findByText } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act / Assert
        await findByText("This is a test error");
    });

    it("renders correct number of columns", () => {
        // Arrange
        const { getAllByRole } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act / Assert
        expect(getAllByRole("columnheader").length).to.equal(DatasetColumns.length);
    });

    it("renders rows for each dataset", () => {
        // Arrange
        const useDatasetDetailsStub = sandbox
            .stub(useDatasetDetails, "default")
            .callsFake(() => [mockDatasetList, false, undefined]);

        const { getAllByRole } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act / Assert
        // Rows should be total datasets + header
        expect(getAllByRole("row").length).to.equal(mockIdList.length + 1);
        expect(useDatasetDetailsStub.called).to.be.true;
    });
});
