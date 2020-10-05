import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileAnnotationList from "../FileAnnotationList";
import FileDetail from "../../../entity/FileDetail";
import { initialState } from "../../../state";
import PersistentConfigService from "../../../services/PersistentConfigService";

describe("<FileAnnotationList />", () => {
    describe("file path representation", () => {
        it("has both canonical file path and file path adjusted to OS & allen mount point", () => {
            // Arrange
            const expectedMountPoint = "/home/testUser/my/path/to/my-isilon";
            class CustomPersistentConfigService implements PersistentConfigService {
                public get() {
                    return expectedMountPoint;
                }
                public set() {
                    return;
                }
                public setAllenMountPoint() {
                    return Promise.reject("Setting allen mount in test");
                }
                public setImageJExecutableLocation() {
                    return Promise.reject("Setting Image J in test");
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        persistentConfigService: new CustomPersistentConfigService(),
                    },
                },
            });
            const { store } = configureMockStore({ state });
            const filePathInsideAllenDrive = "/path/to/MyFile.txt";
            const filePath = "/allen" + filePathInsideAllenDrive;
            const fileDetails = new FileDetail({
                filePath,
                fileId: "abc123",
                fileName: "MyFile.txt",
                fileSize: 7,
                uploaded: "01/01/01",
                uploadedBy: "test-user",
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
    });
});
