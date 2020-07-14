import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import { downloadManifest, SET_STATUS, ProcessStatus } from "../actions";
import interactionLogics from "../logics";
import { initialState } from "../..";
import NumericRange from "../../../entity/NumericRange";
import FileDownloadService from "../../../services/FileDownloadService";
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
    });
});
