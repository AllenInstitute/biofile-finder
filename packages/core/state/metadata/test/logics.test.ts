import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { createSandbox } from "sinon";

import {
    receiveDataSources,
    RECEIVE_ANNOTATIONS,
    requestAnnotations,
    requestDataSources,
} from "../actions";
import metadataLogics from "../logics";
import { initialState, interaction } from "../../";
import DatasetService, { DataSource } from "../../../services/DataSourceService";

describe("Metadata logics", () => {
    describe("requestAnnotations", () => {
        it("Fires RECEIVE_ANNOTATIONS action after processing REQUEST_ANNOTATIONS action", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
            });

            const responseStub = {
                when: () => true,
                respondWith: {
                    data: {
                        data: [
                            {
                                annotationDisplayName: "Foo",
                                annotationName: "foo",
                                values: [],
                                type: "Text",
                            },
                        ],
                    },
                },
            };

            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: metadataLogics,
                responseStubs: responseStub,
            });

            // act
            store.dispatch(requestAnnotations());
            await logicMiddleware.whenComplete();

            // assert
            expect(actions.includesMatch({ type: RECEIVE_ANNOTATIONS })).to.be.true;
        });
    });

    describe("requestDataSources", () => {
        const sandbox = createSandbox();
        const dataSources: DataSource[] = [
            {
                id: "123414",
                name: "Microscopy Set",
                type: "csv",
                version: 1,
                uri: "",
                created: new Date(),
                createdBy: "test",
            },
        ];

        before(() => {
            const datasetService = new DatasetService();
            sandbox.stub(interaction.selectors, "getDatasetService").returns(datasetService);
            sandbox.stub(datasetService, "getAll").resolves(dataSources);
        });

        afterEach(() => {
            sandbox.resetHistory();
        });

        after(() => {
            sandbox.restore();
        });

        [requestDataSources, interaction.actions.refresh].forEach((action) => {
            it(`Processes ${action().type} into RECEIVE_DATA_SOURCES action`, async () => {
                // Arrange
                const { actions, logicMiddleware, store } = configureMockStore({
                    state: initialState,
                    logics: metadataLogics,
                });

                // Act
                store.dispatch(action());
                await logicMiddleware.whenComplete();

                // Assert
                expect(actions.includesMatch(receiveDataSources(dataSources))).to.be.true;
            });
        });
    });
});
