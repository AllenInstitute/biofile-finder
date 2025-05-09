import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { createSandbox } from "sinon";

import {
    receiveDataSources,
    RECEIVE_ANNOTATIONS,
    requestAnnotations,
    requestDataSources,
    receiveDatasetManifest,
    requestDatasetManifest,
} from "../actions";
import metadataLogics from "../logics";
import { initialState, interaction } from "../../";
import DatasetService, { DataSource } from "../../../services/DataSourceService";
import DatabaseServiceNoop from "../../../services/DatabaseService/DatabaseServiceNoop";

describe("Metadata logics", () => {
    describe("requestAnnotations", () => {
        it("Fires RECEIVE_ANNOTATIONS action after processing REQUEST_ANNOTATIONS action", async () => {
            // arrange
            const state = mergeState(initialState, {});

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

    describe("requestDataManifest", () => {
        const datasetManifestSource: DataSource = {
            id: "123414",
            name: "Dataset Manifest",
            type: "csv",
            uri: "fake-uri.test",
        };
        class MockDatabaseService extends DatabaseServiceNoop {
            public async addDataSource(): Promise<void> {
                return Promise.resolve();
            }
        }
        const state = mergeState(initialState, {
            interaction: {
                platformDependentServices: {
                    databaseService: new MockDatabaseService(),
                },
            },
        });

        it(`Processes requestDatasetmanifest into RECEIVE_DATASET_MANIFEST action`, async () => {
            // Arrange
            const { actions, logicMiddleware, store } = configureMockStore({
                state: state,
                logics: metadataLogics,
            });

            // Act
            store.dispatch(requestDatasetManifest(datasetManifestSource.name));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch(
                    receiveDatasetManifest(
                        datasetManifestSource.name,
                        datasetManifestSource.uri as string
                    )
                )
            ).to.be.true;
        });
    });
});
