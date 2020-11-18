import { configureMockStore, mergeState, createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import fs from "fs";
import os from "os";
import { createSandbox } from "sinon";

import {
    downloadManifest,
    ProcessStatus,
    REMOVE_STATUS,
    SET_STATUS,
    cancelManifestDownload,
    openFilesInImageJ,
    SET_ALLEN_MOUNT_POINT,
    SET_IMAGE_J_LOCATION,
    generatePythonSnippet,
} from "../actions";
import interactionLogics from "../logics";
import { initialState, interaction, selection } from "../..";
import FileFilter from "../../../entity/FileFilter";
import FileSelection from "../../../entity/FileSelection";
import FileService from "../../../services/FileService";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";
import FileDownloadService, { CancellationToken } from "../../../services/FileDownloadService";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";
import { ExecutionEnvService, ExecutableEnvCancellationToken, FileViewerService } from "../../..";
import DatasetService from "../../../services/DatasetService";

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
                    fileFiltersForManifestDownload: filters,
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
        const datasetId = "89j1d321a";
        const responseStubs = [
            {
                when: `${baseUrl}/${DatasetService.BASE_DATASET_URL}`,
                respondWith: {
                    data: { data: [datasetId] },
                },
            },
            // TODO: FileService mock when it is fleshed out
        ];

        const mockHttpClient = createMockHttpClient(responseStubs);
        const datasetService = new DatasetService({
            baseUrl,
            httpClient: mockHttpClient,
        });
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
        });

        const sandbox = createSandbox();

        beforeEach(() => {
            sandbox.stub(interaction.selectors, "getDatasetService").returns(datasetService);
            sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
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
            const pythonSnippet =
                "TODO: Python Snippet API not yet implemented, request: " + datasetId;

            // Act
            const action = generatePythonSnippet("My name", ["Cell Line"], new Date());
            store.dispatch(action);
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    ...action,
                    payload: {
                        ...action.payload,
                        pythonSnippet,
                    },
                })
            ).to.be.true;
        });
    });

    describe("openFilesInImageJ", () => {
        const files = [];
        const filePaths: string[] = [];
        const expectedAllenDrive = "/some/test/path/to/fakeAllen";
        for (let i = 0; i <= 100; i++) {
            const filePath = "/fakeFile" + i;
            files.push({ filePath: "/allen" + filePath });
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
            class UselessExecutionEnvService implements ExecutionEnvService {
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
                    imageJExecutable: expectedExecutablePath,
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

            // Act
            store.dispatch(openFilesInImageJ());
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
                    type: SET_IMAGE_J_LOCATION,
                })
            ).to.be.false;
        });

        it("prevents prompting to select Image J executable when user cancels selecting mount point", async () => {
            // Arrange
            let attemptedToSetImageJ = false;
            class UselessExecutionEnvService implements ExecutionEnvService {
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

            // Act
            store.dispatch(openFilesInImageJ());
            await logicMiddleware.whenComplete();

            // Assert
            expect(attemptedToSetImageJ).to.be.false;
        });

        it("prevents prompting to select Allen Drive when it is at the expected location", async () => {
            // Arrange
            let attemptedToSetAllenDrive = false;
            class UselessExecutionEnvService implements ExecutionEnvService {
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

            // Act
            store.dispatch(openFilesInImageJ());
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
            class UselessExecutionEnvService implements ExecutionEnvService {
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

            // Act
            store.dispatch(openFilesInImageJ());
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
            class UselessExecutionEnvService implements ExecutionEnvService {
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
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        fileViewerService: new UselessFileViewerService(),
                    },
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(openFilesInImageJ());
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
            expect(
                actions.includesMatch({
                    type: SET_IMAGE_J_LOCATION,
                    payload: {
                        imageJExecutable: expectedExecutablePath,
                    },
                })
            ).to.be.true;
        });
    });
});
