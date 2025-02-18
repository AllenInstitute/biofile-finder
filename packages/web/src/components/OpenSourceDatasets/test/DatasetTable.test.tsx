import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { createSandbox } from "sinon";

import DatasetTable from "../DatasetTable";
import * as useDatasetDetails from "../useDatasetDetails";
import { DATASET_TABLE_FIELDS, DatasetAnnotations } from "../../../entity/PublicDataset";
import { makePublicDatasetMock } from "../../../entity/PublicDataset/mocks";
import { initialState } from "../../../../../core/state";
import DatabaseFileService from "../../../../../core/services/FileService/DatabaseFileService";
import FileSort, { SortOrder } from "../../../../../core/entity/FileSort";

describe("<DatasetTable />", () => {
    const sandbox = createSandbox();
    const mockRouter = createBrowserRouter([
        {
            path: "/",
            element: <DatasetTable onLoadDataset={noop} />,
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
        sandbox.stub(useDatasetDetails, "default").callsFake(() => [[], false, undefined]);

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
        expect(getAllByRole("columnheader").length).to.equal(DATASET_TABLE_FIELDS.length);
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

    it("sorts on column header click", async () => {
        const getSpy = sandbox.spy(useDatasetDetails, "default");

        const { getByText } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        const mockFileSortAsc = new FileSort(
            DatasetAnnotations.DATASET_NAME.displayLabel,
            SortOrder.ASC
        );
        const mockFileSortDesc = new FileSort(
            DatasetAnnotations.DATASET_NAME.displayLabel,
            SortOrder.DESC
        );
        const mockFileSortAscCount = new FileSort(
            DatasetAnnotations.FILE_COUNT.displayLabel,
            SortOrder.ASC
        );

        // Act / Assert
        fireEvent.click(getByText(/Dataset Name/i));
        expect(getSpy.calledWith([], mockFileSortAsc)).to.be.true;
        fireEvent.click(getByText(/Dataset Name/i));
        expect(getSpy.calledWith([], mockFileSortDesc)).to.be.true;
        fireEvent.click(getByText(/File count/i));
        expect(getSpy.calledWith([], mockFileSortAscCount)).to.be.true;
    });
});
