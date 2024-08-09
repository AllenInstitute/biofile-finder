import { configureMockStore, mergeState } from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { createSandbox } from "sinon";

import { initialState } from "../../../../../core/state";
import DatabaseFileService from "../../../../../core/services/FileService/DatabaseFileService";

import DatasetTable, { DATASET_TABLE_COLUMNS } from "../DatasetTable";

describe("<DatasetTable />", () => {
    const sandbox = createSandbox();
    const mockIdList = ["abc123", "def456", "ghi789"];
    const mockDataSources = mockIdList.map((id) => ({
        id,
        name: id,
        version: "1",
        count: "2",
        creationDate: "2021-01-01",
        size: "1",
        description: "Test description",
        source: "wherever",
    }));

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

        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetTable rows={[]} onSelect={noop} />,
            },
            {
                path: "/app",
                element: <></>,
            },
        ]);

        const { findByText } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act / Assert
        // Wait for the fileService call to return, then check for updated list length display
        await findByText("No datasets found");
    });

    it("renders correct number of columns", () => {
        // Arrange
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetTable rows={mockDataSources} onSelect={noop} />,
            },
            {
                path: "/app",
                element: <></>,
            },
        ]);

        const { getAllByRole } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act / Assert
        expect(getAllByRole("columnheader").length).to.equal(DATASET_TABLE_COLUMNS.length);
    });

    it("renders rows for each dataset", () => {
        // Arrange
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetTable rows={mockDataSources} onSelect={noop} />,
            },
            {
                path: "/app",
                element: <></>,
            },
        ]);

        const { getAllByRole } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act / Assert
        // Rows should be total datasets + header
        expect(getAllByRole("row").length).to.equal(mockIdList.length + 1);
    });

    it("selects dataset when row is clicked", () => {
        // Arrange
        const mockRouter = createBrowserRouter([
            {
                path: "/",
                element: <DatasetTable rows={mockDataSources} onSelect={noop} />,
            },
            {
                path: "/app",
                element: <></>,
            },
        ]);

        const { getByText } = render(
            <Provider store={store}>
                <RouterProvider router={mockRouter} />
            </Provider>
        );

        // Act
        fireEvent.click(getByText(mockDataSources[0].name));

        // Assert
        expect(getByText("blah")).to.not.be.undefined;
    });
});
