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
import { ExecutableEnvService, FileViewerCancellationToken, FileViewerService } from "../../..";

describe("Interaction logics", () => {
    const fileSelection = new FileSelection().select({
        fileSet: new FileSet(),
        index: new NumericRange(0, 100),
        sortOrder: 0,
    });

    describe("downloadManifest", () => {
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
            store.dispatch(downloadManifest([], []));
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
            store.dispatch(downloadManifest([], []));
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
            store.dispatch(downloadManifest([], []));
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
            store.dispatch(downloadManifest([], []));
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
            const state = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: baseUrl,
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const filters = [
                new FileFilter("Cell Line", "AICS-12"),
                new FileFilter("Notes", "Hello"),
            ];
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

            const sandbox = createSandbox();
            sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
            sandbox.stub(selection.selectors, "getFileSelection").throws("Test failed");

            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
                responseStubs: responseStub,
            });

            // act
            store.dispatch(downloadManifest(filters, []));
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
            sandbox.restore();
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
            const expectedExecutablePath = "";
            let actualFilePaths: string[] | undefined = undefined;
            let actualExecutablePath: string | undefined = undefined;
            class UselessFileViewerService implements FileViewerService {
                open(executablePath: string, filePaths?: string[]) {
                    actualFilePaths = filePaths;
                    actualExecutablePath = executablePath;
                    return Promise.resolve();
                }
            }
            class UselessExecutableEnvService implements ExecutableEnvService {
                promptForAllenMountPoint() {
                    return Promise.resolve(FileViewerCancellationToken);
                }
                promptForExecutable() {
                    return Promise.resolve(FileViewerCancellationToken);
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
                    platformDependentServices: {
                        executableEnvService: new UselessExecutableEnvService(),
                        fileViewerService: new UselessFileViewerService(),
                    },
                },
                selection: {
                    allenMountPoint: expectedAllenDrive,
                    fileSelection: fakeSelection,
                    imageJExecutable: expectedExecutablePath,
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
            expect(actualFilePaths).to.be.deep.equal(filePaths);
            expect(actualExecutablePath).to.be.equal(expectedExecutablePath);
        });

        it("prevents prompting to select Image J executable when user cancels selecting mount point", async () => {
            // Arrange
            let attemptedToSetImageJ = false;
            class UselessExecutableEnvService implements ExecutableEnvService {
                promptForAllenMountPoint() {
                    return Promise.resolve(FileViewerCancellationToken);
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
                        executableEnvService: new UselessExecutableEnvService(),
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
            class UselessExecutableEnvService implements ExecutableEnvService {
                promptForAllenMountPoint() {
                    attemptedToSetAllenDrive = true;
                    return Promise.reject("test");
                }
                promptForExecutable() {
                    return Promise.resolve(FileViewerCancellationToken);
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
                        executableEnvService: new UselessExecutableEnvService(),
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
            class UselessExecutableEnvService implements ExecutableEnvService {
                promptForAllenMountPoint() {
                    return Promise.resolve("test");
                }
                promptForExecutable() {
                    return Promise.resolve(FileViewerCancellationToken);
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
                        executableEnvService: new UselessExecutableEnvService(),
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
    });
});
