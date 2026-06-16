import { configureMockStore, mergeState } from "@aics/redux-utils";
import { render, waitFor } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";

import useDisplayText from "../useDisplayText";
import Annotation from "../../../../entity/Annotation";
import AnnotationName from "../../../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../../../entity/AnnotationFormatter";
import FileDetail, { FmsFile } from "../../../../entity/FileDetail";
import { Environment } from "../../../../constants";
import { MetadataValue, NestedMetadataValue } from "../../../../services/FileService";
import ExecutionEnvServiceNoop from "../../../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { initialState } from "../../../../state";

// Helper component that exercises the hook and renders the result
function TestComponent(props: {
    file: FileDetail;
    metadataKey: string;
    value: MetadataValue;
    annotation: Annotation | undefined;
    childRows: NestedMetadataValue[];
}) {
    const { text, emphasize } = useDisplayText(
        props.file,
        props.metadataKey,
        props.value,
        props.annotation,
        props.childRows
    );
    return (
        <div>
            <span data-testid="text">{text ?? ""}</span>
            <span data-testid="emphasize">{String(emphasize)}</span>
        </div>
    );
}

describe("useDisplayText", () => {
    const testAnnotation = new Annotation({
        annotationName: ["test"],
        description: "",
        type: AnnotationType.STRING,
    });
    const localFilePathAnnotation = new Annotation({
        annotationName: [AnnotationName.LOCAL_FILE_PATH],
        description: "",
        type: AnnotationType.STRING,
    });
    const emptyFile: FmsFile = {
        file_path: "test.files.allencell.org/path/to/file.txt",
        file_id: "abc123",
        file_name: "file.txt",
        file_size: 100,
        uploaded: "01/01/01",
        annotations: [],
    };

    describe("default value display", () => {
        it("joins values using annotation formatter", () => {
            // Arrange
            const file = new FileDetail(emptyFile, Environment.TEST);
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new ExecutionEnvServiceNoop(),
                        },
                    },
                }),
            });

            // Act
            const { getByTestId } = render(
                <Provider store={store}>
                    <TestComponent
                        file={file}
                        metadataKey="test"
                        value={["hello", "world"]}
                        annotation={testAnnotation}
                        childRows={[]}
                    />
                </Provider>
            );

            // Assert
            expect(getByTestId("text").textContent).to.equal("hello, world");
            expect(getByTestId("emphasize").textContent).to.equal("false");
        });

        it("falls back to comma-separated join when annotation is undefined", () => {
            // Arrange
            const file = new FileDetail(emptyFile, Environment.TEST);
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new ExecutionEnvServiceNoop(),
                        },
                    },
                }),
            });

            // Act
            const { getByTestId } = render(
                <Provider store={store}>
                    <TestComponent
                        file={file}
                        metadataKey="unknown"
                        value={["a", "b", "c"]}
                        annotation={undefined}
                        childRows={[]}
                    />
                </Provider>
            );

            // Assert
            expect(getByTestId("text").textContent).to.equal("a, b, c");
        });
    });

    describe("nested metadata (childRows)", () => {
        it("displays singular 'entry' when there is 1 child row", () => {
            // Arrange
            const file = new FileDetail(emptyFile, Environment.TEST);
            const childRows: NestedMetadataValue[] = [{ Dose: ["10mg"] }];
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new ExecutionEnvServiceNoop(),
                        },
                    },
                }),
            });

            // Act
            const { getByTestId } = render(
                <Provider store={store}>
                    <TestComponent
                        file={file}
                        metadataKey="test"
                        value={[]}
                        annotation={testAnnotation}
                        childRows={childRows}
                    />
                </Provider>
            );

            // Assert
            expect(getByTestId("text").textContent).to.equal("1 entry");
        });

        it("displays plural 'entries' when there are multiple child rows", () => {
            // Arrange
            const file = new FileDetail(emptyFile, Environment.TEST);
            const childRows: NestedMetadataValue[] = [
                { Dose: ["10mg"] },
                { Dose: ["20mg"] },
                { Dose: ["30mg"] },
            ];
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new ExecutionEnvServiceNoop(),
                        },
                    },
                }),
            });

            // Act
            const { getByTestId } = render(
                <Provider store={store}>
                    <TestComponent
                        file={file}
                        metadataKey="test"
                        value={[]}
                        annotation={testAnnotation}
                        childRows={childRows}
                    />
                </Provider>
            );

            // Assert
            expect(getByTestId("text").textContent).to.equal("3 entries");
        });
    });

    describe("local file path handling", () => {
        it("shows download in progress message when file is being downloaded", () => {
            // Arrange
            const file = new FileDetail(
                {
                    ...emptyFile,
                    annotations: [{ name: AnnotationName.SHOULD_BE_IN_LOCAL, values: [true] }],
                },
                Environment.TEST
            );
            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new ExecutionEnvServiceNoop(),
                        },
                    },
                }),
            });

            // Act
            const { getByTestId } = render(
                <Provider store={store}>
                    <TestComponent
                        file={file}
                        metadataKey={AnnotationName.LOCAL_FILE_PATH}
                        value={["/some/path"]}
                        annotation={localFilePathAnnotation}
                        childRows={[]}
                    />
                </Provider>
            );

            // Assert
            expect(getByTestId("text").textContent).to.equal("Copying to VAST in progress…");
            expect(getByTestId("emphasize").textContent).to.equal("true");
        });

        it("displays formatted local path once resolved", async () => {
            // Arrange
            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath.replace("/test", "/mounted"));
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

            const file = new FileDetail(
                {
                    ...emptyFile,
                    annotations: [
                        { name: AnnotationName.SHOULD_BE_IN_LOCAL, values: [true] },
                        { name: AnnotationName.CACHE_EVICTION_DATE, values: ["2026-01-01"] },
                        { name: AnnotationName.LOCAL_FILE_PATH, values: ["/test/my_file.czi"] },
                    ],
                },
                Environment.TEST
            );

            const { getByTestId } = render(
                <Provider store={store}>
                    <TestComponent
                        file={file}
                        metadataKey={AnnotationName.LOCAL_FILE_PATH}
                        value={["/test/my_file.czi"]}
                        annotation={localFilePathAnnotation}
                        childRows={[]}
                    />
                </Provider>
            );

            await waitFor(() => {
                expect(getByTestId("text").textContent).to.equal("/mounted/my_file.czi");
            });
            expect(getByTestId("emphasize").textContent).to.equal("false");
        });

        it("returns null text when local path has not yet resolved", () => {
            // Using a service that never resolves to simulate loading state
            class NeverResolveService extends ExecutionEnvServiceNoop {
                public formatPathForHost(): Promise<string> {
                    // Intentionally never resolves, to simulate the loading state
                    return new Promise<string>(() => undefined);
                }
            }

            const { store } = configureMockStore({
                state: mergeState(initialState, {
                    interaction: {
                        platformDependentServices: {
                            executionEnvService: new NeverResolveService(),
                        },
                    },
                }),
            });

            const file = new FileDetail(
                {
                    ...emptyFile,
                    annotations: [
                        { name: AnnotationName.SHOULD_BE_IN_LOCAL, values: [true] },
                        { name: AnnotationName.CACHE_EVICTION_DATE, values: ["2026-01-01"] },
                        { name: AnnotationName.LOCAL_FILE_PATH, values: ["/test/my_file.czi"] },
                    ],
                },
                Environment.TEST
            );

            const { getByTestId } = render(
                <Provider store={store}>
                    <TestComponent
                        file={file}
                        metadataKey={AnnotationName.LOCAL_FILE_PATH}
                        value={["/test/my_file.czi"]}
                        annotation={localFilePathAnnotation}
                        childRows={[]}
                    />
                </Provider>
            );

            // Initially null since the async call hasn't resolved
            expect(getByTestId("text").textContent).to.equal("");
            expect(getByTestId("emphasize").textContent).to.equal("false");
        });
    });
});
