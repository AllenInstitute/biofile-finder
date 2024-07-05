import { configureMockStore, mergeState, createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get } from "lodash";
import { createSandbox } from "sinon";

import { initialState, interaction } from "../..";
import {
    downloadManifest,
    ProcessStatus,
    REMOVE_STATUS,
    SET_STATUS,
    cancelFileDownload,
    refresh,
    OPEN_WITH,
    openWith,
    SET_USER_SELECTED_APPLICATIONS,
    promptForNewExecutable,
    openWithDefault,
    downloadFiles,
} from "../actions";
import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../../services/ExecutionEnvService";
import ExecutionEnvServiceNoop from "../../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import interactionLogics from "../logics";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter from "../../../entity/FileFilter";
import FileSet from "../../../entity/FileSet";
import FileSelection from "../../../entity/FileSelection";
import NumericRange from "../../../entity/NumericRange";
import { RECEIVE_ANNOTATIONS } from "../../metadata/actions";
import { SET_AVAILABLE_ANNOTATIONS } from "../../selection/actions";
import FileDownloadService, {
    DownloadResolution,
    FileInfo,
} from "../../../services/FileDownloadService";
import FileViewerService from "../../../services/FileViewerService";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";
import NotificationServiceNoop from "../../../services/NotificationService/NotificationServiceNoop";
import HttpFileService from "../../../services/FileService/HttpFileService";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";
import FileDetail, { FmsFile } from "../../../entity/FileDetail";
import DatabaseServiceNoop from "../../../services/DatabaseService/DatabaseServiceNoop";

describe("Interaction logics", () => {
    const fileSelection = new FileSelection().select({
        fileSet: new FileSet(),
        index: new NumericRange(0, 100),
        sortOrder: 0,
    });

    class FakeFileViewerService implements FileViewerService {
        open() {
            return Promise.resolve();
        }
    }

    class MockDatabaseService extends DatabaseServiceNoop {
        saveQuery() {
            return Promise.resolve(new Uint8Array());
        }
    }

    describe("downloadManifest", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("marks the beginning of a manifest download with a status update", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest([], "csv"));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("marks the success of a manifest download with a status update", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        databaseService: new MockDatabaseService(),
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    dataSources: [{ name: "mock" }],
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest([], "csv"));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("marks the failure of a manifest download with a status update", async () => {
            // arrange
            class FailingDownloadSerivce implements FileDownloadService {
                isFileSystemAccessible = false;
                getDefaultDownloadDirectory() {
                    return Promise.reject();
                }
                download() {
                    return Promise.reject();
                }
                prepareHttpResourceForDownload() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FailingDownloadSerivce(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest([], "csv"));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.FAILED,
                        },
                    },
                })
            ).to.equal(true);

            // sanity-check: make certain this isn't evergreen
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(false);
        });

        it("doesn't use selected files when given a specific file folder path", async () => {
            // arrange
            const baseUrl = "test";
            const filters = [
                new FileFilter("Cell Line", "AICS-12"),
                new FileFilter("Notes", "Hello"),
            ];
            sandbox.stub(fileSelection, "toCompactSelectionList").throws("Test failed");
            const state = mergeState(initialState, {
                interaction: {
                    fileFiltersForVisibleModal: filters,
                    fileExplorerServiceBaseUrl: baseUrl,
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const responseStub = {
                when: () => true,
                respondWith: {
                    data: { data: [42] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const fileService = new HttpFileService({
                baseUrl,
                httpClient: mockHttpClient,
                downloadService: new FileDownloadServiceNoop(),
            });

            sandbox.stub(interaction.selectors, "getFileService").returns(fileService);

            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
                responseStubs: responseStub,
            });

            // act
            store.dispatch(downloadManifest([], "csv"));
            await logicMiddleware.whenComplete();

            // assert
            // if the selected files were used this shouldn't succeed
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.be.true;
        });
    });

    describe("downloadFiles", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("marks the beginning of a file download with a status update", async () => {
            // Arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file = new FileDetail({
                file_id: "678142",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            });

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("downloads multiple files", async () => {
            // Arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file1 = new FileDetail({
                file_id: "930213",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            });
            const file2 = new FileDetail({
                file_id: "8932432",
                file_name: "test_file_2",
                file_size: 2349014,
                file_path: "/some/path/test_file_2",
                uploaded: "whenever",
                annotations: [],
            });

            // Act
            store.dispatch(downloadFiles([file1, file2]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                            fileId: [file1.id],
                        },
                    },
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                            fileId: [file2.id],
                        },
                    },
                })
            ).to.be.true;
        });

        it("marks the success of a file download with a status update", async () => {
            // Arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file = new FileDetail({
                file_id: "32490241",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            });

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("dispatches progress events", async () => {
            // Arrange
            class TestDownloadSerivce implements FileDownloadService {
                isFileSystemAccessible = true;
                getDefaultDownloadDirectory() {
                    return Promise.resolve("wherever");
                }
                prepareHttpResourceForDownload() {
                    return Promise.reject();
                }
                download(
                    _fileInfo: FileInfo,
                    downloadRequestId: string,
                    onProgress?: (bytesDownloaded: number) => void
                ) {
                    onProgress?.(1);
                    return Promise.resolve({
                        downloadRequestId,
                        msg: "Success",
                        resolution: DownloadResolution.SUCCESS,
                    });
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadSerivce(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file = new FileDetail({
                file_id: "5483295",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            });

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.PROGRESS,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("marks the failure of a file download with a status update", async () => {
            // Arrange
            class TestDownloadSerivce implements FileDownloadService {
                isFileSystemAccessible = true;
                getDefaultDownloadDirectory() {
                    return Promise.resolve("wherever");
                }
                prepareHttpResourceForDownload() {
                    return Promise.reject();
                }
                download() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadSerivce(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file = new FileDetail({
                file_id: "872342",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            });

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.FAILED,
                        },
                    },
                })
            ).to.equal(true);

            // sanity-check: make certain this isn't evergreen
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(false);
        });

        it("clears status for download request if request was cancelled", async () => {
            // Arrange
            class TestDownloadSerivce implements FileDownloadService {
                isFileSystemAccessible = true;
                getDefaultDownloadDirectory() {
                    return Promise.resolve("wherever");
                }
                prepareHttpResourceForDownload() {
                    return Promise.reject();
                }
                download(_fileInfo: FileInfo, downloadRequestId: string) {
                    return Promise.resolve({
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                cancelActiveRequest() {
                    return Promise.reject();
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadSerivce(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file = new FileDetail({
                file_id: "930213",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            });

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: REMOVE_STATUS,
                })
            ).to.equal(true);
        });

        it("triggers platform specific download", async () => {
            // Arrange
            let isDownloading = false;
            const expectedDestination = "yay real destination";
            class UselessFileDownloadService implements FileDownloadService {
                isFileSystemAccessible = false;
                public prepareHttpResourceForDownload() {
                    return Promise.reject();
                }
                public download(
                    _: FileInfo,
                    downloadRequestId: string,
                    onProgress?: (bytesDownloaded: number) => void
                ) {
                    isDownloading = true;
                    return Promise.resolve({
                        downloadRequestId,
                        onProgress,
                        msg: "",
                        resolution: DownloadResolution.SUCCESS,
                    });
                }
                public getDefaultDownloadDirectory(): Promise<string> {
                    return Promise.resolve(expectedDestination);
                }
                public cancelActiveRequest() {
                    // no-op
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new UselessFileDownloadService(),
                    },
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file = new FileDetail({
                file_id: "32490241",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            });

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(isDownloading).to.be.true;
        });
    });

    describe("cancelFileDownloadLogic", () => {
        it("marks the failure of a download cancellation (on error)", async () => {
            // arrange
            class TestDownloadService implements FileDownloadService {
                isFileSystemAccessible = false;
                getDefaultDownloadDirectory() {
                    return Promise.reject();
                }
                prepareHttpResourceForDownload() {
                    return Promise.reject();
                }
                download(
                    _fileInfo: FileInfo,
                    downloadRequestId: string,
                    onProgress?: (bytesDownloaded: number) => void
                ) {
                    return Promise.resolve({
                        downloadRequestId,
                        onProgress,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                cancelActiveRequest() {
                    throw new Error("KABOOM");
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadService(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(cancelFileDownload("123456"));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.FAILED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("clears status if cancelled", async () => {
            // arrange
            const downloadRequestId = "beepbop";
            class TestDownloadService implements FileDownloadService {
                isFileSystemAccessible = false;
                getDefaultDownloadDirectory() {
                    return Promise.reject();
                }
                download() {
                    return Promise.resolve({
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                prepareHttpResourceForDownload() {
                    return Promise.reject();
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadService(),
                    },
                    status: [
                        {
                            data: {
                                msg: "downloading...",
                                status: ProcessStatus.STARTED,
                            },
                            processId: downloadRequestId,
                        },
                    ],
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(cancelFileDownload(downloadRequestId));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: REMOVE_STATUS,
                    payload: {
                        processId: downloadRequestId,
                    },
                })
            ).to.equal(true);
        });
    });

    describe("refresh", () => {
        const sandbox = createSandbox();
        const baseUrl = "test";
        const annotations = annotationsJson.map((annotation) => new Annotation(annotation));
        const availableAnnotations = [annotations[1].displayName];
        const responseStubs = [
            {
                when: `${baseUrl}/${HttpAnnotationService.BASE_ANNOTATION_URL}`,
                respondWith: {
                    data: { data: annotations },
                },
            },
            {
                when: (config: any) =>
                    _get(config, "url", "").includes(
                        HttpAnnotationService.BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY
                    ),
                respondWith: {
                    data: { data: availableAnnotations },
                },
            },
        ];
        const mockHttpClient = createMockHttpClient(responseStubs);
        const annotationService = new HttpAnnotationService({
            baseUrl,
            httpClient: mockHttpClient,
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("refreshes annotations & which annotations are available based on hierarchy", async () => {
            // Arrange
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
            const { actions, store, logicMiddleware } = configureMockStore({
                state: initialState,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(refresh());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: availableAnnotations,
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: RECEIVE_ANNOTATIONS,
                })
            ).to.be.true;
        });

        it("sets available annotations to all annotations on failure", async () => {
            // Arrange
            sandbox.stub(interaction.selectors, "getAnnotationService").throws();
            const expectedAnnotation = new Annotation({
                annotationName: "Failure",
                annotationDisplayName: "Failure",
                type: AnnotationType.BOOLEAN,
                description: "Test annotation for failure",
            });
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [expectedAnnotation],
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(refresh());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: [expectedAnnotation.displayName],
                })
            ).to.be.true;
        });
    });

    describe("promptForNewExecutable", () => {
        const files = [];
        const fileKinds = ["PNG", "TIFF"];
        for (let i = 0; i <= 100; i++) {
            files.push({
                file_path: `/allen/file_${i}.ext`,
                annotations: [
                    {
                        name: AnnotationName.KIND,
                        values: fileKinds,
                    },
                    {
                        name: "Cell Line",
                        values: ["AICS-10", "AICS-12"],
                    },
                ],
            });
        }
        const baseUrl = "test";
        const responseStub = {
            when: () => true,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new HttpFileService({
            baseUrl,
            httpClient: mockHttpClient,
            downloadService: new FileDownloadServiceNoop(),
        });
        const fakeSelection = new FileSelection().select({
            fileSet: new FileSet({ fileService }),
            index: new NumericRange(0, 100),
            sortOrder: 0,
        });

        it("saves and opens selected files", async () => {
            // Arrange
            let userWasPromptedForDefault = false;
            let userWasPromptedForExecutable = false;
            const expectedExecutablePath = "/some/path/to/imageJ";
            class UselessNotificationService extends NotificationServiceNoop {
                showQuestion() {
                    userWasPromptedForDefault = true;
                    return Promise.resolve(true);
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForExecutable() {
                    userWasPromptedForExecutable = true;
                    return Promise.resolve(expectedExecutablePath);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        fileViewerService: new FakeFileViewerService(),
                        notificationService: new UselessNotificationService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const app = {
                filePath: expectedExecutablePath,
                defaultFileKinds: fileKinds,
            };

            // Act
            store.dispatch(promptForNewExecutable());
            await logicMiddleware.whenComplete();

            // Assert
            expect(userWasPromptedForDefault).to.be.true;
            expect(userWasPromptedForExecutable).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_USER_SELECTED_APPLICATIONS,
                    payload: [app],
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app,
                    },
                })
            ).to.be.true;
        });

        it("stops when user cancels", async () => {
            // Arrange
            let userWasPromptedForDefault = false;
            let userWasPromptedForExecutable = false;
            class UselessNotificationService extends NotificationServiceNoop {
                showQuestion() {
                    userWasPromptedForDefault = true;
                    return Promise.resolve(false);
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForExecutable() {
                    userWasPromptedForExecutable = true;
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        notificationService: new UselessNotificationService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(promptForNewExecutable());
            await logicMiddleware.whenComplete();

            // Assert
            expect(userWasPromptedForDefault).to.be.false;
            expect(userWasPromptedForExecutable).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_USER_SELECTED_APPLICATIONS,
                })
            ).to.be.false;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                })
            ).to.be.false;
        });

        it("does not set as default when user selects 'No'", async () => {
            // Arrange
            let userWasPromptedForDefault = false;
            let userWasPromptedForExecutable = false;
            const expectedExecutablePath = "/some/path/to/imageJ";
            class UselessNotificationService extends NotificationServiceNoop {
                showQuestion() {
                    userWasPromptedForDefault = true;
                    return Promise.resolve(false);
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForExecutable() {
                    userWasPromptedForExecutable = true;
                    return Promise.resolve(expectedExecutablePath);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        ...initialState.interaction.platformDependentServices,
                        executionEnvService: new UselessExecutionEnvService(),
                        fileViewerService: new FakeFileViewerService(),
                        notificationService: new UselessNotificationService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const app = {
                filePath: expectedExecutablePath,
                defaultFileKinds: [],
            };

            // Act
            store.dispatch(promptForNewExecutable());
            await logicMiddleware.whenComplete();

            // Assert
            expect(userWasPromptedForDefault).to.be.true;
            expect(userWasPromptedForExecutable).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_USER_SELECTED_APPLICATIONS,
                    payload: [app],
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: { app },
                })
            ).to.be.true;
        });
    });

    describe("openWithDefault", () => {
        const csvKind = "CSV";
        const csvFiles: Partial<FmsFile>[] = [];
        for (let i = 0; i <= 50; i++) {
            csvFiles.push({
                file_path: `/csv${i}.txt`,
                annotations: [{ name: AnnotationName.KIND, values: [csvKind] }],
            });
        }
        const pngKind = "PNG";
        const pngFiles: Partial<FmsFile>[] = [];
        for (let i = 0; i <= 50; i++) {
            pngFiles.push({
                file_path: `/png${i}.txt`,
                annotations: [{ name: AnnotationName.KIND, values: [pngKind] }],
            });
        }
        const files = [...csvFiles, ...pngFiles];
        const baseUrl = "test";
        const responseStub = {
            when: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new HttpFileService({
            baseUrl,
            httpClient: mockHttpClient,
            downloadService: new FileDownloadServiceNoop(),
        });
        const fakeSelection = new FileSelection().select({
            fileSet: new FileSet({ fileService }),
            index: new NumericRange(0, 100),
            sortOrder: 0,
        });

        class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
            public formatPathForHost(posixPath: string): Promise<string> {
                return Promise.resolve(posixPath);
            }
        }

        it("attempts to open selected files with default apps", async () => {
            const app1 = {
                defaultFileKinds: [csvKind],
                filePath: "my/path/to/my/first/fake.app",
            };
            const app2 = {
                defaultFileKinds: [pngKind],
                filePath: "my/path/to/my/second/fake.app",
            };
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new FakeExecutionEnvService(),
                        fileViewerService: new FakeFileViewerService(),
                    },
                    userSelectedApplications: [app1, app2],
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(openWithDefault());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app: app1,
                    },
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app: app2,
                    },
                })
            ).to.be.true;
        });

        it("attempts to open selected files by system default", async () => {
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new FakeExecutionEnvService(),
                        fileViewerService: new FakeFileViewerService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(openWithDefault());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app: {
                            defaultFileKinds: [],
                            filePath: SystemDefaultAppLocation,
                        },
                    },
                })
            ).to.be.true;
        });
    });

    describe("openWith", () => {
        const files: { file_path: string }[] = [];
        for (let i = 0; i <= 100; i++) {
            files.push({ file_path: `/allen/file_${i}.ext` });
        }
        const baseUrl = "test";
        const responseStub = {
            when: `${baseUrl}/${HttpFileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new HttpFileService({
            baseUrl,
            httpClient: mockHttpClient,
            downloadService: new FileDownloadServiceNoop(),
        });

        it("attempts to open selected files", async () => {
            // Arrange
            const fakeSelection = new FileSelection().select({
                fileSet: new FileSet({ fileService }),
                index: new NumericRange(0, 100),
                sortOrder: 0,
            });
            const expectedExecutablePath = "/some/path/to/imageJ";
            let actualFilePaths: string[] | undefined = undefined;
            let actualExecutablePath: string | undefined = undefined;

            class FakeFileViewerService implements FileViewerService {
                open(executablePath: string, filePaths?: string[]) {
                    actualFilePaths = filePaths;
                    actualExecutablePath = executablePath;
                    return Promise.resolve();
                }
            }

            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath);
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new FakeExecutionEnvService(),
                        fileViewerService: new FakeFileViewerService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });

            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            const app = {
                filePath: expectedExecutablePath,
                name: "ImageJ",
                defaultFileKinds: [],
            };

            // Act
            store.dispatch(openWith(app));
            await logicMiddleware.whenComplete();

            // Assert
            expect(actualFilePaths).to.be.deep.equal(files.map((file) => file.file_path));
            expect(actualExecutablePath).to.be.equal(expectedExecutablePath);
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: [
                        {
                            ...app,
                            filePath: expectedExecutablePath,
                        },
                    ],
                })
            ).to.be.false;
        });
    });
});
