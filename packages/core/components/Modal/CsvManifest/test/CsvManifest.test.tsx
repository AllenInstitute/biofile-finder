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
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../../constants";
import Annotation from "../../../../entity/Annotation";
import FileFilter from "../../../../entity/FileFilter";
import FileDownloadService, { DownloadResolution } from "../../../../services/FileDownloadService";
import { initialState, interaction, reduxLogics } from "../../../../state";
import HttpFileService from "../../../../services/FileService/HttpFileService";

describe("<CsvManifest />", () => {
    const baseUrl = "test";
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
            visibleModal: ModalType.CsvManifest,
        },
    });

    const responseStub: ResponseStub = {
        when: (config) => _get(config, "url", "").includes(HttpFileService.BASE_FILE_COUNT_URL),
        respondWith: {
            data: { data: [42] },
        },
    };
    const mockHttpClient = createMockHttpClient(responseStub);
    const fileService = new HttpFileService({ baseUrl, httpClient: mockHttpClient });

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
        expect(getByText("Download CSV Manifest")).to.exist;
    });

    it("starts download and saves columns when download button is clicked", async () => {
        // Arrange
        let downloadTriggered = false;
        class TestDownloadService implements FileDownloadService {
            downloadCsvManifest(_url: string, _data: string, downloadRequestId: string) {
                downloadTriggered = true;
                return Promise.resolve({
                    downloadRequestId,
                    resolution: DownloadResolution.SUCCESS,
                });
            }

            downloadFile() {
                return Promise.reject();
            }

            getDefaultDownloadDirectory(): Promise<string> {
                return Promise.reject();
            }

            promptForDownloadDirectory() {
                return Promise.reject();
            }

            cancelActiveRequest() {
                return Promise.reject();
            }
        }

        const state = mergeState(visibleDialogState, {
            interaction: {
                fileFiltersForVisibleModal: [new FileFilter("Cell Line", "AICS-11")],
                platformDependentServices: {
                    fileDownloadService: new TestDownloadService(),
                },
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
        const downloadButton = await findByText("Download");
        fireEvent.click(downloadButton);
        await logicMiddleware.whenComplete();

        // Assert
        expect(
            actions.includesMatch({
                type: interaction.actions.DOWNLOAD_MANIFEST,
            })
        ).to.be.true;
        expect(downloadTriggered).to.be.true;
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
