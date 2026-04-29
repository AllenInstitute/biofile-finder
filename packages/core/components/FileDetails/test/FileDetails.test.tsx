import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import { Environment } from "../../../constants";
import FileDetail from "../../../entity/FileDetail";
import { initialState } from "../../../state";

import FileDetails from "..";

describe("<FileDetails />", () => {
    it("should allow zarr downloads even when size is unknown", async () => {
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
                uploaded: "01/01/01",
                annotations: [],
            },
            Environment.TEST
        );

        // Act
        const { findByText, getByTestId, queryByText } = render(
            <Provider store={store}>
                <FileDetails fileDetails={fileDetails} />
            </Provider>
        );
        // Assert
        const tooltip = await findByText(/^Download file.*to local system$/);
        expect(tooltip).to.exist;
        expect(getByTestId(/download-file-button/).closest("button")?.disabled).to.be.false;
        expect(queryByText(/^File.*exceeds maximum download size/)).to.not.exist;
    });

    it("should allow zarr downloads even when size is known", async () => {
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
                uploaded: "01/01/01",
                annotations: [],
            },
            Environment.TEST
        );

        // Act
        const { findByText, getByTestId, queryByText } = render(
            <Provider store={store}>
                <FileDetails fileDetails={fileDetails} />
            </Provider>
        );
        // Assert
        const tooltip = await findByText(/^Download file.*to local system$/);
        expect(tooltip).to.exist;
        expect(getByTestId(/download-file-button/).closest("button")?.disabled).to.be.false;
        expect(queryByText(/^File.*exceeds maximum download size/)).to.not.exist;
    });

    it("should show fullscreen image when thumbnail is clicked", async () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });
        const thumbnailUrl = "https://example.com/thumbnail.png";
        const fileDetails = new FileDetail(
            {
                file_path: "path/to/testFile.png",
                file_id: "abc123",
                file_name: "testFile.png",
                uploaded: "01/01/01",
                annotations: [{ name: "Thumbnail", values: [thumbnailUrl] }],
            },
            Environment.TEST
        );

        // Act
        const { findByRole, queryByAltText } = render(
            <Provider store={store}>
                <FileDetails fileDetails={fileDetails} />
            </Provider>
        );

        // The fullscreen image should not be visible initially
        expect(queryByAltText("testFile.png")).to.not.exist;

        // Click the thumbnail container button to enlarge
        const thumbnailButton = await findByRole("button", { name: /click to enlarge/i });
        fireEvent.click(thumbnailButton);

        // The fullscreen image should now be visible
        const fullscreenImg = await findByRole("img", { name: "testFile.png" });
        expect(fullscreenImg).to.exist;
        expect(fullscreenImg.getAttribute("src")).to.equal(thumbnailUrl);
    });
});
