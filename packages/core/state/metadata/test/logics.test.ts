import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { createSandbox } from "sinon";

import {
    receiveCollections,
    RECEIVE_ANNOTATIONS,
    requestAnnotations,
    requestCollections,
} from "../actions";
import metadataLogics from "../logics";
import { initialState, interaction } from "../../";
import DatasetService, { Dataset } from "../../../services/DatasetService";

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

    describe("requestCollections", () => {
        const sandbox = createSandbox();
        const collections: Dataset[] = [
            {
                id: "123414",
                name: "Microscopy Set",
                version: 1,
                query: "",
                client: "",
                fixed: false,
                private: false,
                created: new Date(),
                createdBy: "test",
            },
        ];

        before(() => {
            const datasetService = new DatasetService();
            sandbox.stub(interaction.selectors, "getDatasetService").returns(datasetService);
            sandbox.stub(datasetService, "getDatasets").resolves(collections);
        });

        afterEach(() => {
            sandbox.resetHistory();
        });

        after(() => {
            sandbox.restore();
        });

        [requestCollections, interaction.actions.refresh].forEach((action) => {
            it(`Processes ${action().type} into RECEIVE_COLLECTIONS action`, async () => {
                // Arrange
                const { actions, logicMiddleware, store } = configureMockStore({
                    state: initialState,
                    logics: metadataLogics,
                });

                // Act
                store.dispatch(action());
                await logicMiddleware.whenComplete();

                // Assert
                expect(actions.includesMatch(receiveCollections(collections))).to.be.true;
            });
        });
    });
});
