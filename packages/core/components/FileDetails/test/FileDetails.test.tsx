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
    const makeStore = (overrides = {}) =>
        configureMockStore({ state: mergeState(initialState, overrides) }).store;

    const makeFile = (overrides: Record<string, unknown> = {}) =>
        new FileDetail(
            {
                file_path: "path/to/testFile.zarr",
                file_id: "abc123",
                file_name: "testFile.zarr",
                file_size: 0,
                uploaded: "01/01/01",
                annotations: [],
                ...overrides,
            },
            Environment.TEST
        );

    it("renders the file name", async () => {
        const { findByText } = render(
            <Provider store={makeStore()}>
                <FileDetails fileDetails={makeFile()} />
            </Provider>
        );
        expect(await findByText("testFile.zarr")).to.exist;
    });

    it("renders a close button when onClose is provided", async () => {
        const { findByRole } = render(
            <Provider store={makeStore()}>
                <FileDetails fileDetails={makeFile()} onClose={() => undefined} />
            </Provider>
        );
        // TransparentIconButton(iconName="Clear") renders an IconButton with aria-label="Clear"
        expect(await findByRole("button", { name: "Clear" })).to.exist;
    });

    it("renders nothing interactive when file is undefined", () => {
        const { container } = render(
            <Provider store={makeStore()}>
                <FileDetails fileDetails={undefined} />
            </Provider>
        );
        expect(container.querySelector("#download-file-button")).to.be.null;
    });

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

        // Act
        const { findByText, getByTestId, queryByText } = render(
            <Provider store={store}>
                <FileDetails fileDetails={makeFile()} />
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

        // Act
        const { findByRole, queryByAltText } = render(
            <Provider store={store}>
                <FileDetails fileDetails={makeFile({ thumbnail: thumbnailUrl })} />
            </Provider>
        );

        // The fullscreen image should not be visible initially
        expect(queryByAltText("testFile.zarr")).to.not.exist;

        // Click the thumbnail container button to enlarge
        const thumbnailButton = await findByRole("button", { name: /click to enlarge/i });
        fireEvent.click(thumbnailButton);

        // The fullscreen image should now be visible
        const fullscreenImg = await findByRole("img", { name: "testFile.zarr" });
        expect(fullscreenImg).to.exist;
        expect(fullscreenImg.getAttribute("src")).to.equal(thumbnailUrl);
    });
});
