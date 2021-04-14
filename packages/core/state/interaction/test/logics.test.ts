import {
    configureMockStore,
    mergeState,
    createMockHttpClient,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import fs from "fs";
import { get as _get } from "lodash";
import os from "os";
import { createSandbox } from "sinon";

import { initialState, interaction, selection } from "../..";
import {
    downloadManifest,
    ProcessStatus,
    REMOVE_STATUS,
    SET_STATUS,
    cancelManifestDownload,
    SET_ALLEN_MOUNT_POINT,
    generatePythonSnippet,
    SUCCEED_PYTHON_SNIPPET_GENERATION,
    SET_CSV_COLUMNS,
    refresh,
    OPEN_WITH,
    openWith,
    SET_USER_SELECTED_APPLICATIONS,
    promptForNewExecutable,
    openWithDefault,
} from "../actions";
import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import DatasetService from "../../../services/DatasetService";
import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../../services/ExecutionEnvService";
import ExecutionEnvServiceNoop from "../../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import interactionLogics from "../logics";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter from "../../../entity/FileFilter";
import FileSet from "../../../entity/FileSet";
import FileSelection from "../../../entity/FileSelection";
import NumericRange from "../../../entity/NumericRange";
import { RECEIVE_ANNOTATIONS } from "../../metadata/actions";
import { SET_AVAILABLE_ANNOTATIONS } from "../../selection/actions";
import AnnotationService from "../../../services/AnnotationService";
import FileDownloadService, { CancellationToken } from "../../../services/FileDownloadService";
import FileService, { FmsFile } from "../../../services/FileService";
import FileViewerService from "../../../services/FileViewerService";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";
import { NotificationService } from "../../../services";
import NotificationServiceNoop from "../../../services/NotificationService/NotificationServiceNoop";

describe("Interaction logics", () => {
    const fileSelection = new FileSelection().select({
        fileSet: new FileSet(),
        index: new NumericRange(0, 100),
        sortOrder: 0,
    });

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
            store.dispatch(downloadManifest([]));
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
            store.dispatch(downloadManifest([]));
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
                downloadCsvManifest() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    return Promise.reject();
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
            store.dispatch(downloadManifest([]));
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

        it("clears status if cancelled", async () => {
            // arrange
            class CancellingDownloadService implements FileDownloadService {
                downloadCsvManifest() {
                    return Promise.resolve(CancellationToken);
                }
                cancelActiveRequest() {
                    return Promise.reject();
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new CancellingDownloadService(),
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
            store.dispatch(downloadManifest([]));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: REMOVE_STATUS,
                })
            ).to.equal(true);
        });

        it("doesn't use selected files when given a specific file folder path", async () => {
            // arrange
            const baseUrl = "test";
            const filters = [
                new FileFilter("Cell Line", "AICS-12"),
                new FileFilter("Notes", "Hello"),
            ];
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
                when: `${baseUrl}/${FileService.BASE_FILE_COUNT_URL}?Cell%20Line=AICS-12&Notes=Hello`,
                respondWith: {
                    data: { data: [42] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const fileService = new FileService({
                baseUrl,
                httpClient: mockHttpClient,
            });

            sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
            sandbox.stub(selection.selectors, "getFileSelection").throws("Test failed");

            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
                responseStubs: responseStub,
            });

            // act
            store.dispatch(downloadManifest([]));
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
            ).to.equal(true);
        });

        it("updates annotations to persist for the next time a user opens a selection action modal", async () => {
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
            store.dispatch(downloadManifest([]));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_CSV_COLUMNS,
                })
            ).to.equal(true);
        });
    });

    describe("cancelManifestDownloadLogic", () => {
        it("marks the failure of a manifest download cancellation (on error)", async () => {
            // arrange
            class CancellingDownloadService implements FileDownloadService {
                downloadCsvManifest() {
                    return Promise.resolve(CancellationToken);
                }
                cancelActiveRequest() {
                    return Promise.reject(false);
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new CancellingDownloadService(),
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
            store.dispatch(cancelManifestDownload("123456"));
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

        it("delete the downloaded artifact on cancel", async () => {
            // arrange
            const tempDir = os.tmpdir();
            const tempFilePath = tempDir + "/TEMPORARY_FILE_EXPLORER_APP_FILE_FOR_TESTING";
            class CancellingDownloadService implements FileDownloadService {
                downloadCsvManifest() {
                    fs.closeSync(fs.openSync(tempFilePath, "w"));
                    return Promise.resolve(CancellationToken);
                }

                cancelActiveRequest(): Promise<void> {
                    return new Promise((resolve, reject) => {
                        fs.unlink(tempFilePath, (err) => {
                            if (err) {
                                reject();
                            } else {
                                resolve();
                            }
                        });
                    });
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new CancellingDownloadService(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(cancelManifestDownload("123456"));
            await logicMiddleware.whenComplete();

            // assert
            expect(() => fs.accessSync(tempFilePath)).to.throw();
        });
    });

    describe("generatePythonSnippet", () => {
        const baseUrl = "test";
        const dataset = {
            id: "89j1d321a",
            name: "test",
            version: 1,
        };
        const pythonSnippet = {
            setup: "pip install aicsfiles",
            code: `
            from aicsfiles import FileManagementSystem

            fms = FileManagementSystem()
            df = fms.datasets.get_metadata_for_files_within("test")
            `,
        };
        const responseStubs: ResponseStub[] = [
            // dataset creation
            {
                when: (requestConfig) => {
                    if (!requestConfig.url) {
                        return false;
                    }
                    return requestConfig.url === `${baseUrl}/${DatasetService.BASE_DATASET_URL}`;
                },
                respondWith: {
                    data: { data: [dataset] },
                },
            },

            // python snippet generation
            {
                when: (requestConfig) => {
                    if (!requestConfig.url) {
                        return false;
                    }
                    return requestConfig.url.endsWith("/pythonSnippet");
                },
                respondWith: {
                    data: { data: [pythonSnippet] },
                },
            },
        ];

        const mockHttpClient = createMockHttpClient(responseStubs);
        const datasetService = new DatasetService({
            baseUrl,
            httpClient: mockHttpClient,
        });

        const sandbox = createSandbox();

        beforeEach(() => {
            sandbox.stub(interaction.selectors, "getDatasetService").returns(datasetService);
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("it creates datasets before generating snippet for dataset related snippets", async () => {
            const state = mergeState(initialState, {
                selection: {
                    fileSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            const action = generatePythonSnippet("My name", TOP_LEVEL_FILE_ANNOTATIONS, new Date());
            store.dispatch(action);
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SUCCEED_PYTHON_SNIPPET_GENERATION,
                })
            ).to.be.true;
        });
    });

    describe("refresh", () => {
        const sandbox = createSandbox();
        const baseUrl = "test";
        const annotations = annotationsJson.map((annotation) => new Annotation(annotation));
        const availableAnnotations = [annotations[1].displayName];
        const responseStubs = [
            {
                when: `${baseUrl}/${AnnotationService.BASE_ANNOTATION_URL}`,
                respondWith: {
                    data: { data: annotations },
                },
            },
            {
                when: (config: any) =>
                    _get(config, "url", "").includes(
                        AnnotationService.BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY
                    ),
                respondWith: {
                    data: { data: availableAnnotations },
                },
            },
        ];
        const mockHttpClient = createMockHttpClient(responseStubs);
        const annotationService = new AnnotationService({
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
            when: () => true, // `${baseUrl}/${FileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
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
                promptForAllenMountPoint() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(false);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
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
                promptForAllenMountPoint() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(false);
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
            csvFiles.push({ annotations: [{ name: AnnotationName.KIND, values: [csvKind] }] });
        }
        const pngKind = "PNG";
        const pngFiles: Partial<FmsFile>[] = [];
        for (let i = 0; i <= 50; i++) {
            pngFiles.push({ annotations: [{ name: AnnotationName.KIND, values: [pngKind] }] });
        }
        const files = [...csvFiles, ...pngFiles];
        const baseUrl = "test";
        const responseStub = {
            when: `${baseUrl}/${FileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
        });
        const fakeSelection = new FileSelection().select({
            fileSet: new FileSet({ fileService }),
            index: new NumericRange(0, 100),
            sortOrder: 0,
        });

        it("attempts to open selected files with default apps", async () => {
            const app1 = {
                defaultFileKinds: [csvKind],
                filePath: "my/path/to/my/first/fake.app",
            };
            const app2 = {
                defaultFileKinds: [pngKind],
                filePath: "my/path/to/my/second/fake.app",
            };
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForAllenMountPoint() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
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
                        files: csvFiles,
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
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForAllenMountPoint() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
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
        const files = [];
        const filePaths: string[] = [];
        const expectedAllenDrive = "/some/test/path/to/fakeAllen";
        for (let i = 0; i <= 100; i++) {
            const filePath = "/fakeFile" + i;
            files.push({ file_path: "/allen" + filePath });
            filePaths.push(expectedAllenDrive + filePath);
        }
        const baseUrl = "test";
        const responseStub = {
            when: `${baseUrl}/${FileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
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
            class UselessFileViewerService implements FileViewerService {
                open(executablePath: string, filePaths?: string[]) {
                    actualFilePaths = filePaths;
                    actualExecutablePath = executablePath;
                    return Promise.resolve();
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForAllenMountPoint() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                promptForExecutable() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(true);
                }
                isValidExecutable() {
                    return Promise.resolve(true);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    allenMountPoint: expectedAllenDrive,
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        fileViewerService: new UselessFileViewerService(),
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
            expect(actualFilePaths).to.be.deep.equal(filePaths);
            expect(actualExecutablePath).to.be.equal(expectedExecutablePath);
            expect(
                actions.includesMatch({
                    type: SET_ALLEN_MOUNT_POINT,
                })
            ).to.be.false;
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

        it("prevents prompting to select executable location when user cancels selecting mount point", async () => {
            // Arrange
            let attemptedToSetImageJ = false;
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForAllenMountPoint() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                promptForExecutable() {
                    attemptedToSetImageJ = true;
                    return Promise.resolve("test");
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(false);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                    },
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const app = {
                filePath: "",
                name: "ImageJ",
                defaultFileKinds: [],
            };

            // Act
            store.dispatch(openWith(app));
            await logicMiddleware.whenComplete();

            // Assert
            expect(attemptedToSetImageJ).to.be.false;
        });

        it("prevents prompting to select Allen Drive when it is at the expected location", async () => {
            // Arrange
            let attemptedToSetAllenDrive = false;
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForAllenMountPoint() {
                    attemptedToSetAllenDrive = true;
                    return Promise.resolve("test");
                }
                promptForExecutable() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(true);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    allenMountPoint: "test",
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                    },
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const app = {
                filePath: "/some/path/to/ZEN",
                name: "ZEN 2",
                defaultFileKinds: ["CZI"],
            };

            // Act
            store.dispatch(openWith(app));
            await logicMiddleware.whenComplete();

            // Assert
            expect(attemptedToSetAllenDrive).to.be.false;
        });

        it("prevents opening selecting files when user cancels selecting image J executable", async () => {
            // Arrange
            let attemptedToOpenFiles = false;
            class UselessFileViewerService implements FileViewerService {
                open() {
                    attemptedToOpenFiles = true;
                    return Promise.resolve();
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForAllenMountPoint() {
                    return Promise.resolve("test");
                }
                promptForExecutable() {
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(true);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        fileViewerService: new UselessFileViewerService(),
                    },
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const app = {
                filePath: "",
                name: "ZEN 2",
                defaultFileKinds: ["CZI"],
            };

            // Act
            store.dispatch(openWith(app));
            await logicMiddleware.whenComplete();

            // Assert
            expect(attemptedToOpenFiles).to.be.false;
        });

        it("prompts & sets allen mount point & image j location when not present/valid", async () => {
            // Arrange
            class UselessFileViewerService implements FileViewerService {
                open() {
                    return Promise.resolve();
                }
            }
            let promptedForAllenMountPoint = false;
            let promptedForExecutable = false;
            const expectedExecutablePath = "some/path/to/imageJ";
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForAllenMountPoint() {
                    promptedForAllenMountPoint = true;
                    return Promise.resolve(expectedAllenDrive);
                }
                promptForExecutable() {
                    promptedForExecutable = true;
                    return Promise.resolve(expectedExecutablePath);
                }
                isValidAllenMountPoint() {
                    return Promise.resolve(false);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const app = {
                filePath: "",
                name: "ImageJ/Fiji",
                defaultFileKinds: ["OMETIFF"],
            };
            const anotherApp = {
                filePath: "my/fun/path/to/AdobePhotoshop",
                name: "Photoshop",
                defaultFileKinds: ["PNG", "JPG"],
            };
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        fileViewerService: new UselessFileViewerService(),
                    },
                    userSelectedApplications: [app, anotherApp],
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(openWith(app));
            await logicMiddleware.whenComplete();

            // Assert
            expect(promptedForAllenMountPoint).to.be.true;
            expect(promptedForExecutable).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_ALLEN_MOUNT_POINT,
                    payload: {
                        allenMountPoint: expectedAllenDrive,
                    },
                })
            ).to.be.true;
            // expect(JSON.stringify(actions.list)).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_USER_SELECTED_APPLICATIONS,
                    payload: [
                        {
                            ...app,
                            filePath: expectedExecutablePath,
                        },
                        anotherApp,
                    ],
                })
            ).to.be.true;
        });
    });
});
