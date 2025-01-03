import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileAnnotationList from "../FileAnnotationList";
import FileDetail from "../../../entity/FileDetail";
import ExecutionEnvServiceNoop from "../../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { initialState } from "../../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

describe("<FileAnnotationList />", () => {
    describe("file path representation", () => {
        it("has both cloud file path and local file path adjusted to OS & allen mount point", async () => {
            // Arrange
            const hostMountPoint = "/some/path";

            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath.replace("/allen", hostMountPoint));
                }
            }

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: [
                            ...TOP_LEVEL_FILE_ANNOTATIONS,
                            new Annotation({
                                annotationName: "Local File Path",
                                annotationDisplayName: "File Path (Local VAST)",
                                description: "Path to file in on-premises storage.",
                                type: AnnotationType.STRING,
                            }),
                        ],
                    },
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new FakeExecutionEnvService(),
                        },
                    },
                }),
            });

            const filePathInsideAllenDrive = "path/to/MyFile.txt";
            const filePath = `production.files.allencell.org/${filePathInsideAllenDrive}`;
            const fileDetails = new FileDetail({
                file_path: filePath,
                file_id: "abc123",
                file_name: "MyFile.txt",
                file_size: 7,
                uploaded: "01/01/01",
                annotations: [
                    { name: "Local File Path", values: [`/allen/${filePathInsideAllenDrive}`] },
                ],
            });

            // Act
            const { findByText } = render(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            for (const cellText of [
                "File Path (Cloud)",
                `https://s3.us-west-2.amazonaws.com/${filePath}`,
                "File Path (Local VAST)",
                `${hostMountPoint}/${filePathInsideAllenDrive}`,
            ]) {
                expect(await findByText(cellText)).to.not.be.undefined;
            }
        });

        it("has only cloud file path when no allen mount point is found", () => {
            // Arrange
            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath);
                }
            }

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: TOP_LEVEL_FILE_ANNOTATIONS,
                    },
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new FakeExecutionEnvService(),
                        },
                    },
                }),
            });

            const filePathInsideAllenDrive = "path/to/MyFile.txt";
            const filePath = `production.files.allencell.org/${filePathInsideAllenDrive}`;
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
            expect(() => getByText("File Path (Local VAST)")).to.throw();
            ["File Path (Cloud)", `https://s3.us-west-2.amazonaws.com/${filePath}`].forEach(
                (cellText) => {
                    expect(getByText(cellText)).to.not.be.undefined;
                }
            );
        });
    });
});
