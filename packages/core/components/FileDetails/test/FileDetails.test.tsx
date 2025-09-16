import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import * as useFileDetails from "../useFileDetails";
import { Environment } from "../../../constants";
import FileDetail from "../../../entity/FileDetail";
import { MAX_DOWNLOAD_SIZE_WEB } from "../../../services/FileDownloadService";
import { initialState } from "../../../state";

import FileDetails from "..";
describe("<FileDetails />", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    it("should disable downloads on web when file size exceeds max", async () => {
        // Arrange
        const { store, logicMiddleware } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    isOnWeb: true,
                },
            }),
        });
        const fileDetails = new FileDetail(
            {
                file_path: "path/to/testFile.zarr",
                file_id: "abc123",
                file_name: "testFile.zarr",
                file_size: MAX_DOWNLOAD_SIZE_WEB + 1,
                uploaded: "01/01/01",
                annotations: [],
            },
            Environment.TEST
        );
        sandbox.stub(useFileDetails, "default").returns([fileDetails, false]);

        // Act
        const { getByText, findByText, queryByText } = render(
            <Provider store={store}>
                <FileDetails />
            </Provider>
        );

        await logicMiddleware.whenComplete();

        // Assert
        const tooltip = await findByText(/File exceeds maximum download size/);
        expect(tooltip).to.exist;
        expect(getByText(/DOWNLOAD/).closest("button")?.disabled).to.be.true;
        expect(queryByText(/Download file to local system/)).to.not.exist;
    });

    it("should disable zarr downloads on web when file size is unknown", async () => {
        // Arrange
        const { store, logicMiddleware } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    isOnWeb: true,
                },
            }),
        });
        const fileDetails = new FileDetail(
            {
                file_path: "path/to/testFile.zarr",
                file_id: "abc123",
                file_name: "testFile.zarr",
                file_size: undefined,
                uploaded: "01/01/01",
                annotations: [],
            },
            Environment.TEST
        );
        sandbox.stub(useFileDetails, "default").returns([fileDetails, false]);

        // Act
        const { getByText, findByText, queryByText } = render(
            <Provider store={store}>
                <FileDetails />
            </Provider>
        );

        await logicMiddleware.whenComplete();

        // Assert
        const tooltip = await findByText(/Unable to determine size of .zarr file/);
        expect(tooltip).to.exist;
        expect(getByText(/DOWNLOAD/).closest("button")?.disabled).to.be.true;
        expect(queryByText(/Download file to local system/)).to.not.exist;
    });

    it("should allow zarr downloads when file size is exactly max", async () => {
        // Arrange
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    isOnWeb: true,
                },
            }),
        });

        const fileDetails = new FileDetail(
            {
                file_path: "path/to/testFile.zarr",
                file_id: "abc123",
                file_name: "testFile.zarr",
                file_size: MAX_DOWNLOAD_SIZE_WEB,
                uploaded: "01/01/01",
                annotations: [],
            },
            Environment.TEST
        );
        sandbox.stub(useFileDetails, "default").returns([fileDetails, false]);
        // Act
        const { findByText, getByText, queryByText } = render(
            <Provider store={store}>
                <FileDetails />
            </Provider>
        );
        // Assert
        const tooltip = await findByText(/Download file to local system/);
        expect(tooltip).to.exist;
        expect(getByText(/DOWNLOAD/).closest("button")?.disabled).to.be.false;
        expect(queryByText(/File exceeds maximum download size/)).to.not.exist;
    });

    it("should allow zarr downloads when file size is less than max", async () => {
        // Arrange
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    isOnWeb: true,
                },
            }),
        });

        const fileDetails = new FileDetail(
            {
                file_path: "path/to/testFile.zarr",
                file_id: "abc123",
                file_name: "testFile.zarr",
                file_size: MAX_DOWNLOAD_SIZE_WEB - 1,
                uploaded: "01/01/01",
                annotations: [],
            },
            Environment.TEST
        );
        sandbox.stub(useFileDetails, "default").returns([fileDetails, false]);
        // Act
        const { findByText, getByText, queryByText } = render(
            <Provider store={store}>
                <FileDetails />
            </Provider>
        );
        // Assert
        const tooltip = await findByText(/Download file to local system/);
        expect(tooltip).to.exist;
        expect(getByText(/DOWNLOAD/).closest("button")?.disabled).to.be.false;
        expect(queryByText(/File exceeds maximum download size/)).to.not.exist;
    });

    it("should allow downloads on desktop regardless of file size", () => {
        // Arrange
        const { store } = configureMockStore({
            state: mergeState(initialState, {
                interaction: {
                    isOnWeb: false,
                },
            }),
        });
        const fileDetails = new FileDetail(
            {
                file_path: "path/to/testFile.zarr",
                file_id: "abc123",
                file_name: "testFile.zarr",
                file_size: MAX_DOWNLOAD_SIZE_WEB + 1,
                uploaded: "01/01/01",
                annotations: [],
            },
            Environment.TEST
        );
        sandbox.stub(useFileDetails, "default").returns([fileDetails, false]);
        // Act
        const { getByText, queryByText } = render(
            <Provider store={store}>
                <FileDetails />
            </Provider>
        );
        // Assert
        expect(getByText(/DOWNLOAD/).closest("button")?.disabled).to.be.false;
        expect(queryByText(/File exceeds maximum download size/)).to.not.exist;
        expect(getByText(/Download file to local system/)).to.exist;
    });
});
