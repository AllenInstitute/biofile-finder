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
import sinon from "sinon";

import Modal, { ModalType } from "../..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../../constants";
import Annotation from "../../../../entity/Annotation";
import DatasetService, { Dataset } from "../../../../services/DatasetService";
import { initialState, interaction } from "../../../../state";

describe("<CollectionForm />", () => {
    // All of the test setup related to stubbing an HTTP request is because the PythonSnippetForm,
    // on mount, makes a call to fetch all available datasets
    const baseUrl = "https://test-aics.corp.whatever";

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
        sinon.stub(interaction.selectors, "getDatasetService").returns(datasetService);
    });

    afterEach(() => {
        sinon.resetHistory();
    });

    after(() => {
        sinon.restore();
    });

    describe("Create Mode", () => {
        const visibleDialogState = mergeState(initialState, {
            interaction: {
                fileExplorerServiceBaseUrl: baseUrl,
                visibleModal: ModalType.CreateCollectionForm,
            },
        });

        it("is visible when should not be hidden", () => {
            // Arrange
            const { store } = configureMockStore({ state: visibleDialogState });
            const { getByText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );

            // Assert
            expect(getByText("Generate Collection")).to.exist;
        });

        describe("generate button", () => {
            it("dispatches generation and persistence events when clicked", () => {
                // Arrange
                const { actions, store } = configureMockStore({ state: visibleDialogState });
                const { getByText, getByPlaceholderText } = render(
                    <Provider store={store}>
                        <Modal />
                    </Provider>
                );
                const collection = "My Cool Collection";

                // Act
                const oneDayExpirationOption = getByText("1 Day");
                fireEvent.click(oneDayExpirationOption);

                const collectionNameInput = getByPlaceholderText("Enter collection name...");
                fireEvent.change(collectionNameInput, { target: { value: collection } });

                const generateButton = getByText("Generate");
                fireEvent.click(generateButton);

                // Assert
                expect(
                    actions.includesMatch({
                        type: interaction.actions.GENERATE_SHAREABLE_FILE_SELECTION_LINK,
                        payload: {
                            name: collection,
                            fixed: false,
                            private: true,
                        },
                    })
                ).to.be.true;
            });

            it("is disabled when no name is selected for collection", () => {
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
                        type: interaction.actions.GENERATE_SHAREABLE_FILE_SELECTION_LINK,
                    })
                ).to.be.false;
            });
        });

        describe("column list", () => {
            it("has default columns when none were previously saved", () => {
                // Arrange
                const { store } = configureMockStore({ state: visibleDialogState });
                const { getByText, getByTestId } = render(
                    <Provider store={store}>
                        <Modal />
                    </Provider>
                );

                // (sanity-check) should not be visible until collection is marked as 'fixed'
                TOP_LEVEL_FILE_ANNOTATIONS.forEach((annotation) => {
                    expect(() => getByText(annotation.displayName)).to.throw();
                });

                // Act
                const checkbox = getByTestId("is-fixed-checkbox").querySelector("input");
                expect(checkbox).to.exist;
                fireEvent.click(checkbox as HTMLElement);

                // Assert
                TOP_LEVEL_FILE_ANNOTATIONS.forEach((annotation) => {
                    expect(getByText(annotation.displayName)).to.exist;
                });
            });

            it("has pre-saved columns when some were previously saved", () => {
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
                const { getByText, getByTestId } = render(
                    <Provider store={store}>
                        <Modal />
                    </Provider>
                );

                // (sanity-check) should not be visible until collection is marked as 'fixed'
                preSavedColumns.forEach((value) => {
                    expect(() => getByText(value)).to.throw();
                });

                // Act
                const checkbox = getByTestId("is-fixed-checkbox").querySelector("input");
                expect(checkbox).to.exist;
                fireEvent.click(checkbox as HTMLElement);

                // Assert
                preSavedColumns.forEach((value) => {
                    expect(getByText(value)).to.exist;
                });
            });
        });
    });

    describe("Edit Mode", () => {
        const mockCollection: Dataset = {
            id: "12341",
            name: "Fake Collection",
            version: 2,
            query: "test",
            client: "test",
            fixed: true,
            private: true,
            created: new Date(),
            createdBy: "test",
        };
        const visibleDialogState = mergeState(initialState, {
            interaction: {
                fileExplorerServiceBaseUrl: baseUrl,
                visibleModal: ModalType.EditCollectionForm,
            },
            selection: {
                collection: mockCollection,
            },
        });

        it("is visible when should not be hidden", () => {
            // Arrange
            const { store } = configureMockStore({ state: visibleDialogState });
            const { getByText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );

            // Assert
            expect(getByText(`Update ${mockCollection.name}`)).to.exist;
        });

        it("disables name input", () => {
            // Arrange
            const { store } = configureMockStore({ state: visibleDialogState });
            const { getByDisplayValue } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );

            // Assert
            expect((getByDisplayValue(mockCollection.name) as HTMLInputElement).disabled).to.be
                .true;
        });

        it("shows current expiration as an option", () => {
            // Arrange
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 1);
            const expiration = `${
                expirationDate.toISOString().replace("T", " ").split(".")[0]
            } (Current)`;
            const state = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: baseUrl,
                    visibleModal: ModalType.EditCollectionForm,
                },
                selection: {
                    collection: {
                        ...mockCollection,
                        expiration: expirationDate,
                    },
                },
            });
            const { store } = configureMockStore({ state });
            const { getByText } = render(
                <Provider store={store}>
                    <Modal />
                </Provider>
            );

            // Act / Assert
            expect(getByText(expiration)).to.exist;
        });

        describe("column list", () => {
            it("has default columns when none were previously saved", () => {
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

            it("has pre-saved columns when some were previously saved", () => {
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
});
