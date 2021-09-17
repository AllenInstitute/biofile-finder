import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import Modal, { ModalType } from "../..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../../constants";
import Annotation from "../../../../entity/Annotation";
import DatasetService from "../../../../services/DatasetService";
import { initialState, interaction } from "../../../../state";
import { GENERATE_PYTHON_SNIPPET } from "../../../../state/interaction/actions";

describe("<DatasetForm />", () => {
    const sandbox = createSandbox();

    // All of the test setup related to stubbing an HTTP request is because the DatasetForm,
    // on mount, makes a call to fetch all available datasets
    const baseUrl = "https://test-aics.corp.whatever";
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
            visibleModal: ModalType.DatasetForm,
        },
    });

    const responseStubs: ResponseStub[] = [
        {
            when: (config) => (config.url || "").includes(DatasetService.BASE_DATASET_URL),
            respondWith: {
                data: { data: [] },
            },
        },
    ];
    const mockHttpClient = createMockHttpClient(responseStubs);
    const datasetService = new DatasetService({ baseUrl, httpClient: mockHttpClient });

    before(() => {
        sandbox.stub(interaction.selectors, "getDatasetService").returns(datasetService);
    });

    afterEach(() => {
        sandbox.resetHistory();
    });

    after(() => {
        sandbox.restore();
    });

    it("is visible when should not be hidden", async () => {
        // Arrange
        const { store } = configureMockStore({ state: visibleDialogState });
        const { getByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        // Assert
        expect(getByText("Generate Python Snippet")).to.exist;
    });

    describe("generate button", () => {
        it("dispatches generation and persistence events when clicked", async () => {
            // Arrange
            const { actions, store } = configureMockStore({ state: visibleDialogState });
            const { getByText, getByPlaceholderText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );
            const dataset = "My Cool Dataset";

            // Act
            const oneDayExpirationOption = getByText("1 Day");
            fireEvent.click(oneDayExpirationOption);

            const datasetNameInput = getByPlaceholderText("Enter dataset name...");
            fireEvent.change(datasetNameInput, { target: { value: dataset } });

            const generateButton = getByText("Generate");
            fireEvent.click(generateButton);

            // Assert
            expect(
                actions.includesMatch({
                    type: GENERATE_PYTHON_SNIPPET,
                    payload: {
                        dataset,
                        annotations: TOP_LEVEL_FILE_ANNOTATIONS,
                    },
                })
            ).to.be.true;
        });

        it("is disabled when no name is selected for dataset", () => {
            // Arrange
            const { actions, store } = configureMockStore({ state: visibleDialogState });
            const { getByText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );

            // Act
            const oneDayExpirationOption = getByText("1 Day");
            fireEvent.click(oneDayExpirationOption);

            const generateButton = getByText("Generate");
            fireEvent.click(generateButton);

            // Assert
            expect(
                actions.includesMatch({
                    type: GENERATE_PYTHON_SNIPPET,
                })
            ).to.be.false;
        });

        it("is disabled when no expiration is selected for dataset", () => {
            // Arrange
            const { actions, store } = configureMockStore({ state: visibleDialogState });
            const { getByText, getByPlaceholderText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );
            const dataset = "My Cool Dataset";

            // Act
            const datasetNameInput = getByPlaceholderText("Enter dataset name...");
            fireEvent.change(datasetNameInput, { target: { value: dataset } });

            const generateButton = getByText("Generate");
            fireEvent.click(generateButton);

            // Assert
            expect(
                actions.includesMatch({
                    type: GENERATE_PYTHON_SNIPPET,
                })
            ).to.be.false;
        });
    });

    describe("column list", () => {
        it("has default columns when none were previousuly saved", async () => {
            // Arrange
            const { store } = configureMockStore({ state: visibleDialogState });
            const { getByText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );

            // Assert
            TOP_LEVEL_FILE_ANNOTATIONS.forEach((annotation) => {
                expect(getByText(annotation.displayName)).to.exist;
            });
        });

        it("has pre-saved columns when some were previousuly saved", async () => {
            // Arrange
            const preSavedColumns = ["Cas9", "Cell Line", "Donor Plasmid"];
            const state = mergeState(visibleDialogState, {
                interaction: {
                    csvColumns: preSavedColumns,
                },
                metadata: {
                    annotations: preSavedColumns.map(
                        (c) =>
                            new Annotation({
                                annotationDisplayName: c,
                                annotationName: c,
                                description: "test",
                                type: "text",
                            })
                    ),
                },
            });
            const { store } = configureMockStore({ state });
            const { getByText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );

            // Assert
            preSavedColumns.forEach((value) => {
                expect(getByText(value)).to.exist;
            });
        });
    });
});
