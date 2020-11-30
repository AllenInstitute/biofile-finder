import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileAnnotationList from "../FileAnnotationList";
import FileDetail from "../../../entity/FileDetail";
import { initialState } from "../../../state";

describe("<FileAnnotationList />", () => {
    describe("file path representation", () => {
        it("has both canonical file path and file path adjusted to OS & allen mount point", () => {
            // Arrange
            const expectedMountPoint = "/home/testUser/my/path/to/my-isilon";
            const state = mergeState(initialState, {
                interaction: {
                    allenMountPoint: expectedMountPoint,
                },
            });
            const { store } = configureMockStore({ state });
            const filePathInsideAllenDrive = "/path/to/MyFile.txt";
            const filePath = "/allen" + filePathInsideAllenDrive;
            const fileDetails = new FileDetail({
                file_path: filePath,
                file_id: "abc123",
                file_name: "MyFile.txt",
                file_size: 7,
                uploaded: "01/01/01",
                uploaded_by: "test-user",
                annotations: [],
            });
            const { getByText } = render(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            ["File path (Local)", "File path (Canonical)"].forEach((filePathDisplayName) => {
                expect(getByText(filePathDisplayName)).to.not.be.undefined;
            });
            expect(getByText(expectedMountPoint + filePathInsideAllenDrive)).to.not.be.undefined;
        });

        it("has only canonical file path when no allen mount point is found", () => {
            // Arrange
            const { store } = configureMockStore({ state: initialState });
            const filePathInsideAllenDrive = "/path/to/MyFile.txt";
            const filePath = "/allen" + filePathInsideAllenDrive;
            const fileDetails = new FileDetail({
                file_path: filePath,
                file_id: "abc123",
                file_name: "MyFile.txt",
                file_size: 7,
                uploaded: "01/01/01",
                uploaded_by: "test-user",
                annotations: [],
            });
            const { getByText } = render(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            expect(() => getByText("File path (Local)")).to.throw;
            expect(getByText("File path (Canonical)")).to.not.be.undefined;
        });
    });
});
