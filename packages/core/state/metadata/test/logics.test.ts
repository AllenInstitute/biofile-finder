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
import DatabaseServiceNoop from "../../../services/DatabaseService/DatabaseServiceNoop";
import { Source } from "../../../entity/FileExplorerURL";
import DataSourceService from "../../../services/DataSourceService";

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
        const dataSources: Source[] = [
            {
                name: "Microscopy Set",
                type: "csv",
                uri: "",
            },
        ];

        before(() => {
            const dataSourceService = new DataSourceService(new DatabaseServiceNoop(), "staging");
            sandbox.stub(interaction.selectors, "getDataSourceService").returns(dataSourceService);
            sandbox.stub(dataSourceService, "getAll").resolves(dataSources);
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
