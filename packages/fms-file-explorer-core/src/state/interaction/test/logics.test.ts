import { configureMockStore, mergeState, createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import { createSandbox } from "sinon";

import { downloadManifest, ProcessStatus, REMOVE_STATUS, SET_STATUS } from "../actions";
import interactionLogics from "../logics";
import { initialState, interaction, selection } from "../..";
import FileFilter from "../../../entity/FileFilter";
import FileService from "../../../services/FileService";
import NumericRange from "../../../entity/NumericRange";
import FileDownloadService, { CancellationToken } from "../../../services/FileDownloadService";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";

describe("Interaction logics", () => {
    describe("downloadManifest", () => {
        it("Marks the beginning of a manifest download with a status update", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    selectedFileRangesByFileSet: {
                        abc: [new NumericRange(0, 100)],
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest());
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        status: ProcessStatus.STARTED,
                    },
                })
            ).to.equal(true);
        });

        it("Marks the success of a manifest download with a status update", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    selectedFileRangesByFileSet: {
                        abc: [new NumericRange(0, 100)],
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest());
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        status: ProcessStatus.SUCCEEDED,
                    },
                })
            ).to.equal(true);
        });

        it("Marks the failure of a manifest download with a status update", async () => {
            // arrange
            class FailingDownloadSerivce implements FileDownloadService {
                downloadCsvManifest() {
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
                    selectedFileRangesByFileSet: {
                        abc: [new NumericRange(0, 100)],
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest());
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        status: ProcessStatus.FAILED,
                    },
                })
            ).to.equal(true);

            // sanity-check: make certain this isn't evergreen
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        status: ProcessStatus.SUCCEEDED,
                    },
                })
            ).to.equal(false);
        });

        it("Clears status if cancelled", async () => {
            // arrange
            class CancellingDownloadService implements FileDownloadService {
                downloadCsvManifest() {
                    return Promise.resolve(CancellationToken);
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new CancellingDownloadService(),
                    },
                },
                selection: {
                    selectedFileRangesByFileSet: {
                        abc: [new NumericRange(0, 100)],
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest());
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: REMOVE_STATUS,
                })
            ).to.equal(true);
        });

        it("Doesn't use selected files when given a specific file folder path", async () => {
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
                    selectedFileRangesByFileSet: {
                        abc: [new NumericRange(0, 100)],
                    },
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
            sandbox
                .stub(selection.selectors, "getSelectedFileRangesByFileSet")
                .throws("Test failed");

            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
                responseStubs: responseStub,
            });

            // act
            store.dispatch(downloadManifest(filters));
            await logicMiddleware.whenComplete();

            // assert
            // if the selected files were used this shouldn't succeed
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        status: ProcessStatus.SUCCEEDED,
                    },
                })
            ).to.equal(true);
            sandbox.restore();
        });
    });
});
