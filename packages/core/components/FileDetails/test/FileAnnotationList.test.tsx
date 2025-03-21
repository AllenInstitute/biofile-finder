import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import FileAnnotationList from "../FileAnnotationList";
import FileDetail from "../../../entity/FileDetail";
import ExecutionEnvServiceNoop from "../../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { initialState } from "../../../state";
import { Environment, TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

describe("<FileAnnotationList />", () => {
    describe("file path representation", () => {
        it("has both cloud file path and local file path adjusted to OS & allen mount point", async () => {
            // Arrange
            const hostMountPoint = "/some/path";

            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath.replace("/test", hostMountPoint));
                }
            }

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    metadata: {
                        annotations: [
                            ...TOP_LEVEL_FILE_ANNOTATIONS,
                            new Annotation({
                                annotationDisplayName: "Cache Eviction Date",
                                annotationName: AnnotationName.CACHE_EVICTION_DATE,
                                description:
                                    "Indicates when the cache for this file should be evicted.",
                                type: AnnotationType.STRING,
                            }),
                            new Annotation({
                                annotationDisplayName: "File Path (Local VAST)",
                                annotationName: AnnotationName.LOCAL_FILE_PATH,
                                description: "Local path for the file on the host machine.",
                                type: AnnotationType.STRING,
                            }),
                            new Annotation({
                                annotationDisplayName: "Should Be in Local Cache",
                                annotationName: AnnotationName.SHOULD_BE_IN_LOCAL,
                                description: "Indicates if the file should be cached locally.",
                                type: AnnotationType.BOOLEAN,
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
            const fileName = "MyFile.txt";
            const relativePath = `/test/${fileName}`;
            const filePath = `test.files.allencell.org/${relativePath}`;
            const fileDetails = new FileDetail(
                {
                    file_path: filePath,
                    file_id: "c32e3eed66e4416d9532d369ffe1636f",
                    file_name: "MyFile.txt",
                    file_size: 7,
                    uploaded: "01/01/01",
                    annotations: [
                        { name: AnnotationName.CACHE_EVICTION_DATE, values: ["SOME DATE"] },
                        { name: AnnotationName.SHOULD_BE_IN_LOCAL, values: [true] },
                        { name: AnnotationName.LOCAL_FILE_PATH, values: [relativePath] },
                    ],
                },
                Environment.TEST
            );

            // Act
            const { findByText } = render(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            await Promise.all([
                findByText("File Path (Cloud)"),
                findByText(`https://s3.us-west-2.amazonaws.com/${filePath}`),
                findByText("File Path (Local VAST)"),
                findByText(`${hostMountPoint}/${fileName}`),
            ]);
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
            const filePath = `test.files.allencell.org/${filePathInsideAllenDrive}`;
            const fileDetails = new FileDetail(
                {
                    file_path: filePath,
                    file_id: "abc123",
                    file_name: "MyFile.txt",
                    file_size: 7,
                    uploaded: "01/01/01",
                    annotations: [],
                },
                Environment.TEST
            );

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

        it("has loading message when file is downloading", () => {
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

            const fileDetails = new FileDetail(
                {
                    file_path: "path/to/file",
                    file_id: "abc123",
                    file_name: "MyFile.txt",
                    file_size: 7,
                    uploaded: "01/01/01",
                    annotations: [{ name: AnnotationName.SHOULD_BE_IN_LOCAL, values: [true] }],
                },
                Environment.TEST
            );

            // Act
            const { findByText } = render(
                <Provider store={store}>
                    <FileAnnotationList isLoading={false} fileDetails={fileDetails} />
                </Provider>
            );

            // Assert
            ["File Path (Local VAST)", "Copying to VAST in progress…"].forEach(async (cellText) => {
                expect(await findByText(cellText)).to.not.be.undefined;
            });
        });
    });
});
