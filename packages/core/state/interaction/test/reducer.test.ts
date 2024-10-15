import { expect } from "chai";

import interaction from "..";
import { initialState } from "../..";
import {
    ProcessStatus,
    removeStatus,
    processStart,
    processSuccess,
    processError,
} from "../actions";

describe("Interaction reducer", () => {
    describe("Process status management", () => {
        it("clears status state for a given process id", () => {
            // arrange
            const processId = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        processId,
                        data: {
                            msg: "something is in progress",
                            status: ProcessStatus.STARTED,
                        },
                    },
                ],
            };

            // act
            const nextState = interaction.reducer(prevState, removeStatus(processId));

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

        it("records the start of a process, leaving only the start status in state", () => {
            // arrange
            const processId = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        processId,
                        data: {
                            msg: "something failed",
                            status: ProcessStatus.ERROR, // say, a previous failure and the user is going to retry
                        },
                    },
                ],
            };
            const startAction = processStart(processId, "something started");

            // act
            const nextState = interaction.reducer(prevState, startAction);

            // assert
            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: nextState,
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.deep.include(startAction.payload);
        });

        it("updates the status of a process to success, leaving only the success status in state", () => {
            // arrange
            const processId = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        processId,
                        data: {
                            msg: "something is in progress",
                            status: ProcessStatus.STARTED,
                        },
                    },
                ],
            };
            const successAction = processSuccess(processId, "huzzah");

            // act
            const nextState = interaction.reducer(prevState, successAction);

            // assert
            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: nextState,
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.deep.include(successAction.payload);
        });

        it("updates the status of a process to failed, leaving only the failure status in state", () => {
            // arrange
            const processId = "abc123";
            const prevState = {
                ...interaction.initialState,
                status: [
                    {
                        processId,
                        data: {
                            msg: "something is in progress",
                            status: ProcessStatus.STARTED,
                        },
                    },
                ],
            };
            const failAction = processError(processId, "whoops");

            // act
            const nextState = interaction.reducer(prevState, failAction);

            // assert
            expect(
                interaction.selectors.getProcessStatuses({
                    ...initialState,
                    interaction: nextState,
                })
            )
                .to.be.an("array")
                .of.length(1)
                .and.to.deep.include(failAction.payload);
        });
    });
});
