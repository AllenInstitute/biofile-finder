import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { mount } from "enzyme";
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
            const expectedMountPoint = "/home/testUser/my/path/to";
            class CustomPersistentConfigService implements PersistentConfigService {
                public get() {
                    return `${expectedMountPoint}/allen`;
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
            const filePath = "/allen/path/to/MyFile.txt";
            const fileDetails = new FileDetail({
                filePath,
                fileId: "abc123",
                fileName: "MyFile.txt",
                fileSize: 7,
                uploaded: "01/01/01",
                uploadedBy: "test-user",
                annotations: [],
            });
            const wrapper = mount(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            ["File path (Local)", "File path (Canonical)"].forEach((filePathDisplayName) => {
                expect(wrapper.contains(filePathDisplayName)).to.equal(true);
            });
            [filePath, expectedMountPoint + filePath].forEach((filePath) => {
                expect(wrapper.contains(filePath)).to.equal(true);
            });
        });
    });
});
