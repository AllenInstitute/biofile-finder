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
    RECEIVE_PASSWORD_MAPPING,
    requestPasswordMapping,
    receiveAnnotations,
} from "../actions";
import metadataLogics from "../logics";
import { initialState, interaction } from "../../";
import { SET_COLUMNS, SET_FILE_FILTERS } from "../../selection/actions";
import DatasetService, { DataSource } from "../../../services/DataSourceService";
import DatabaseServiceNoop from "../../../services/DatabaseService/DatabaseServiceNoop";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../entity/FileFilter";

describe("Metadata logics", () => {
    describe("requestAnnotations", () => {
        it("Fires RECEIVE_ANNOTATIONS action after processing REQUEST_ANNOTATIONS action", async () => {
            // arrange
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
                state: initialState,
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

    describe("receiveAnnotations", () => {
        const mockAnnotations: Annotation[] = [
            new Annotation({
                annotationDisplayName: "annotation A",
                annotationName: "annotation A",
                description: "",
                type: AnnotationType.NUMBER,
            }),
            new Annotation({
                annotationDisplayName: "annotation B",
                annotationName: "annotation B",
                description: "",
                type: AnnotationType.DATE,
            }),
            new Annotation({
                annotationDisplayName: "annotation C",
                annotationName: "annotation C",
                description: "",
                type: AnnotationType.STRING,
            }),
        ];

        it("dispatches filter updates if annotation types have been added", async () => {
            // arrange
            const mockFilters: FileFilter[] = [
                new FileFilter(mockAnnotations[0].name, "123"),
                new FileFilter(mockAnnotations[1].name, new Date()),
            ];
            const state = mergeState(initialState, {
                selection: {
                    filters: mockFilters,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: metadataLogics,
            });

            // pre-check
            expect(actions.includesMatch({ type: SET_FILE_FILTERS })).to.be.false;

            // act
            store.dispatch(receiveAnnotations(mockAnnotations));
            await logicMiddleware.whenComplete();

            // assert
            expect(actions.includesMatch({ type: SET_FILE_FILTERS })).to.be.true;
            const matchingAction = actions.list
                .filter((action) => action.type === SET_FILE_FILTERS)
                .at(0);
            // Same number of filters should still be applied, but they should be updated/changed
            expect(matchingAction?.payload.length).to.equal(mockFilters.length);
            expect(matchingAction?.payload).not.to.equal(mockFilters);
        });

        it("skips dispatching filters if annotation types already match", async () => {
            // arrange
            const mockFilters: FileFilter[] = [
                new FileFilter(
                    mockAnnotations[2].name,
                    "test value",
                    FilterType.DEFAULT,
                    AnnotationType.STRING
                ),
            ];
            const state = mergeState(initialState, {
                selection: {
                    filters: mockFilters,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: metadataLogics,
            });

            // act
            store.dispatch(receiveAnnotations(mockAnnotations));
            await logicMiddleware.whenComplete();

            // assert
            expect(actions.includesMatch({ type: SET_FILE_FILTERS })).to.be.false;
        });

        it("only dispatches columns that still exist in the data source", async () => {
            // arrange
            const mockColumns = mockAnnotations.map((ann) => {
                return { name: ann.name, width: 200 };
            });
            const columnNoLongerExists = { name: "old column", width: 200 };
            const state = mergeState(initialState, {
                selection: {
                    columns: [...mockColumns, columnNoLongerExists],
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: metadataLogics,
            });

            // pre-check
            expect(actions.includesMatch({ type: SET_COLUMNS })).to.be.false;

            // act
            store.dispatch(receiveAnnotations(mockAnnotations));
            await logicMiddleware.whenComplete();

            // assert
            expect(actions.includesMatch({ type: SET_COLUMNS })).to.be.true;
            const matchingAction = actions.list
                .filter((action) => action.type === SET_COLUMNS)
                .at(0);
            // the call should not include the column that no longer exists
            expect(matchingAction?.payload.length).to.equal(mockColumns.length);
        });

        it("dispatches all annotations as columns when there are no existing columns", async () => {
            // arrange: no existing columns
            const { store, logicMiddleware, actions } = configureMockStore({
                state: initialState,
                logics: metadataLogics,
            });

            // act
            store.dispatch(receiveAnnotations(mockAnnotations));
            await logicMiddleware.whenComplete();

            // assert: all annotations should be shown as columns, plus a "File Name" column prepended
            expect(actions.includesMatch({ type: SET_COLUMNS })).to.be.true;
            const matchingAction = actions.list
                .filter((action) => action.type === SET_COLUMNS)
                .at(0);
            // 3 mock annotations + 1 prepended "file_name" column
            expect(matchingAction?.payload.length).to.equal(mockAnnotations.length + 1);
            expect(matchingAction?.payload[0].name).to.equal("file_name");
        });

        it("adds all new annotations as columns to existing ones", async () => {
            // arrange: some existing columns
            const existingColumns = [{ name: mockAnnotations[0].name, width: 300 }];
            const state = mergeState(initialState, {
                selection: {
                    columns: existingColumns,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: metadataLogics,
            });

            // act: receive annotations that include one already shown and two new ones
            store.dispatch(receiveAnnotations(mockAnnotations));
            await logicMiddleware.whenComplete();

            // assert: all annotations should be columns (existing kept, new ones added)
            expect(actions.includesMatch({ type: SET_COLUMNS })).to.be.true;
            const matchingAction = actions.list
                .filter((action) => action.type === SET_COLUMNS)
                .at(0);
            expect(matchingAction?.payload.length).to.equal(mockAnnotations.length);
            // existing column should retain its original width
            const existingColumn = matchingAction?.payload.find(
                (col: { name: string; width: number }) => col.name === mockAnnotations[0].name
            );
            expect(existingColumn?.width).to.equal(300);
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
        const datasetManifestSource = "Dataset Manifest";
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
            store.dispatch(requestDatasetManifest(datasetManifestSource));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch(
                    receiveDatasetManifest(
                        datasetManifestSource,
                        "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/Dataset+Manifest.csv"
                    )
                )
            ).to.be.true;
        });
    });

    describe("requestPasswordMapping", () => {
        it(`Processes requestPasswordMapping into RECEIVE_PASSWORD_MAPPING action`, async () => {
            // Arrange
            const { actions, logicMiddleware, store } = configureMockStore({
                state: initialState,
                logics: metadataLogics,
            });

            // Act
            store.dispatch(requestPasswordMapping());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: RECEIVE_PASSWORD_MAPPING,
                })
            ).to.be.true;
        });
    });
});
