import { expect } from "chai";

import interaction from "..";
import { initialState } from "../..";
import {
    ProcessStatus,
    removeStatus,
    startManifestDownload,
    succeedManifestDownload,
    failManifestDownload,
} from "../actions";

describe("Interaction reducer", () => {
    describe("Process status management", () => {
        it("clears status state for a given process id", () => {
            // arrange
            const id = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        id,
                        data: {
                            msg: "something is in progress",
                            status: ProcessStatus.STARTED,
                        },
                    },
                ],
            };

            // act
            const nextState = interaction.reducer(prevState, removeStatus(id));

            // assert
            // sanity-check on prevState to ensure this isn't evergreen
            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: prevState,
                })
            ).to.not.be.empty;

            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: nextState,
                })
            ).to.be.empty;
        });

        it("records the start of a manifest download, leaving only the start status in state", () => {
            // arrange
            const id = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        id,
                        data: {
                            msg: "something failed",
                            status: ProcessStatus.FAILED, // say, a previous failure and the user is going to retry
                        },
                    },
                ],
            };
            const manifestDownloadStartAction = startManifestDownload(id, "something started");

            // act
            const nextState = interaction.reducer(prevState, manifestDownloadStartAction);

            // assert
            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: nextState,
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.deep.include(manifestDownloadStartAction.payload);
        });

        it("updates the status of a manifest download to success, leaving only the success status in state", () => {
            // arrange
            const id = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        id,
                        data: {
                            msg: "something is in progress",
                            status: ProcessStatus.STARTED,
                        },
                    },
                ],
            };
            const manifestDownloadSuccessAction = succeedManifestDownload(id, "huzzah");

            // act
            const nextState = interaction.reducer(prevState, manifestDownloadSuccessAction);

            // assert
            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: nextState,
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.deep.include(manifestDownloadSuccessAction.payload);
        });

        it("updates the status of a manifest download to failed, leaving only the failure status in state", () => {
            // arrange
            const id = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        id,
                        data: {
                            msg: "something is in progress",
                            status: ProcessStatus.STARTED,
                        },
                    },
                ],
            };
            const manifestDownloadFailAction = failManifestDownload(id, "whoops");

            // act
            const nextState = interaction.reducer(prevState, manifestDownloadFailAction);

            // assert
            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: nextState,
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.deep.include(manifestDownloadFailAction.payload);
        });
    });
});
