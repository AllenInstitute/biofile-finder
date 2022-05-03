import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileAnnotationList from "../FileAnnotationList";
import FileDetail from "../../../entity/FileDetail";
import ExecutionEnvServiceNoop from "../../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { initialState } from "../../../state";

describe("<FileAnnotationList />", () => {
    describe("file path representation", () => {
        it("has both canonical file path and file path adjusted to OS & allen mount point", async () => {
            // Arrange
            const hostMountPoint = "/some/path";

            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath.replace("/allen", hostMountPoint));
                }
            }

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new FakeExecutionEnvService(),
                        },
                    },
                }),
            });

            const filePathInsideAllenDrive = "path/to/MyFile.txt";

            const canonicalFilePath = `/allen/${filePathInsideAllenDrive}`;
            const fileDetails = new FileDetail({
                file_path: canonicalFilePath,
                file_id: "abc123",
                file_name: "MyFile.txt",
                file_size: 7,
                uploaded: "01/01/01",
                annotations: [],
            });

            const expectedLocalPath = `${hostMountPoint}/${filePathInsideAllenDrive}`;

            // Act
            const { findByText } = render(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            [
                "File path (Canonical)",
                canonicalFilePath,
                "File path (Local)",
                expectedLocalPath,
            ].forEach(async (cellText) => {
                expect(await findByText(cellText)).to.not.be.undefined;
            });
        });

        it("has only canonical file path when no allen mount point is found", () => {
            // Arrange
            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath);
                }
            }

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new FakeExecutionEnvService(),
                        },
                    },
                }),
            });

            const filePathInsideAllenDrive = "path/to/MyFile.txt";
            const filePath = `/allen/${filePathInsideAllenDrive}`;
            const fileDetails = new FileDetail({
                file_path: filePath,
                file_id: "abc123",
                file_name: "MyFile.txt",
                file_size: 7,
                uploaded: "01/01/01",
                annotations: [],
            });

            // Act
            const { getByText } = render(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            expect(() => getByText("File path (Local)")).to.throw;
            ["File path (Canonical)", filePath].forEach((cellText) => {
                expect(getByText(cellText)).to.not.be.undefined;
            });
        });
    });
});
