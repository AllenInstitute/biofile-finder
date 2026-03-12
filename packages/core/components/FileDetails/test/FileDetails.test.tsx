import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
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
});
