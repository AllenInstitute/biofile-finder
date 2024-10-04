import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { render, fireEvent } from "@testing-library/react";
import { expect } from "chai";
import { get as _get } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import Modal, { ModalType } from "../..";
import Annotation from "../../../../entity/Annotation";
import FileFilter from "../../../../entity/FileFilter";
import { initialState, interaction, reduxLogics } from "../../../../state";
import HttpFileService from "../../../../services/FileService/HttpFileService";
import FileDownloadServiceNoop from "../../../../services/FileDownloadService/FileDownloadServiceNoop";

describe("<MetadataManifest />", () => {
    const baseUrl = "test";
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
            visibleModal: ModalType.MetadataManifest,
        },
    });

    const responseStub: ResponseStub = {
        when: (config) => _get(config, "url", "").includes(HttpFileService.BASE_FILE_COUNT_URL),
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

    const sandbox = createSandbox();

    before(() => {
        sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
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
        expect(getByText("Download metadata manifest")).to.exist;
    });

    it("starts download when download button is clicked", async () => {
        // Arrange
        const state = mergeState(visibleDialogState, {
            interaction: {
                csvColumns: ["Cell Line"],
                fileFiltersForVisibleModal: [new FileFilter("Cell Line", "AICS-11")],
            },
            metadata: {
                annotations: [
                    new Annotation({
                        annotationDisplayName: "Cell Line",
                        annotationName: "Cell Line",
                        description: "test",
                        type: "text",
                    }),
                ],
            },
        });

        const { store, logicMiddleware, actions } = configureMockStore({
            state,
            logics: reduxLogics,
        });

        const { findByText } = render(
            <Provider store={store}>
                <Modal />
            </Provider>
        );

        // Act
        const downloadButton = await findByText("DOWNLOAD");
        fireEvent.click(downloadButton);
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch({
                type: interaction.actions.DOWNLOAD_MANIFEST,
            })
        ).to.be.true;
    });

    describe("column list", () => {
        it("has pre-saved columns when some were previously saved", async () => {
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
