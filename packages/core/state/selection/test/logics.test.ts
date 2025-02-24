import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get, shuffle } from "lodash";
import sinon from "sinon";

import {
    addFileFilter,
    selectFile,
    reorderAnnotationHierarchy,
    removeFileFilter,
    removeFromAnnotationHierarchy,
    SET_ANNOTATION_HIERARCHY,
    SET_AVAILABLE_ANNOTATIONS,
    SET_FILE_FILTERS,
    SET_FILE_SELECTION,
    SET_OPEN_FILE_FOLDERS,
    decodeFileExplorerURL,
    setAnnotationHierarchy,
    selectNearbyFile,
    SET_SORT_COLUMN,
    changeDataSources,
    changeSourceMetadata,
    collapseAllFileFolders,
    expandAllFileFolders,
} from "../actions";
import { initialState, interaction } from "../../";
import { FESBaseUrl } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import FileFilter from "../../../entity/FileFilter";
import selectionLogics from "../logics";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import NumericRange from "../../../entity/NumericRange";
import FileExplorerURL from "../../../entity/FileExplorerURL";
import FileFolder from "../../../entity/FileFolder";
import FileSet from "../../../entity/FileSet";
import FileSelection from "../../../entity/FileSelection";
import FileSort, { SortOrder } from "../../../entity/FileSort";
import { DatasetService } from "../../../services";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";
import { DataSource } from "../../../services/DataSourceService";
import HttpFileService from "../../../services/FileService/HttpFileService";
import DatabaseServiceNoop from "../../../services/DatabaseService/DatabaseServiceNoop";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";

describe("Selection logics", () => {
    describe("selectFile", () => {
        const fileSet1 = new FileSet();
        const fileSet2 = new FileSet({
            filters: [new FileFilter("Cell Line", "AICS-13")],
        });

        it("does not include existing file selections when updateExistingSelection is false", async () => {
            // arrange
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select({ fileSet: fileSet1, index: 3, sortOrder: 0 })
                        .select({ fileSet: fileSet2, index: 99, sortOrder: 1 }),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile({ fileSet: fileSet1, selection: 5, sortOrder: 0 }));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection().select({
                        fileSet: fileSet1,
                        index: 5,
                        sortOrder: 0,
                    }),
                })
            ).to.equal(true);
        });

        it("appends newly selected file to existing selections when updateExistingSelection is true -- discontinuous selections", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection().select({
                        fileSet: fileSet1,
                        index: 9,
                        sortOrder: 0,
                    }),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(
                selectFile({
                    fileSet: fileSet1,
                    selection: 14,
                    sortOrder: 0,
                    updateExistingSelection: true,
                })
            );
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select({ fileSet: fileSet1, index: 9, sortOrder: 0 })
                        .select({ fileSet: fileSet1, index: 14, sortOrder: 0 }),
                })
            ).to.equal(true);
        });

        it("preserves past selections when updateExistingSelection is true and new selection is a range", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select({ fileSet: fileSet1, index: new NumericRange(9, 15), sortOrder: 0 })
                        .select({
                            fileSet: fileSet2,
                            index: new NumericRange(100, 200),
                            sortOrder: 1,
                        }),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(
                selectFile({
                    fileSet: fileSet1,
                    selection: new NumericRange(20, 100),
                    sortOrder: 0,
                    updateExistingSelection: true,
                })
            );
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select({ fileSet: fileSet1, index: new NumericRange(9, 15), sortOrder: 0 })
                        .select({
                            fileSet: fileSet2,
                            index: new NumericRange(100, 200),
                            sortOrder: 1,
                        })
                        .select({
                            fileSet: fileSet1,
                            index: new NumericRange(20, 100),
                            sortOrder: 0,
                        }),
                })
            ).to.equal(true);
        });

        it("deselects a file if file is already selected and updateExistingSelection is true", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select({ fileSet: fileSet1, index: new NumericRange(8, 15), sortOrder: 0 })
                        .select({ fileSet: fileSet1, index: 22, sortOrder: 0 }),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(
                selectFile({
                    fileSet: fileSet1,
                    selection: 12,
                    sortOrder: 0,
                    updateExistingSelection: true,
                })
            );
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select({ fileSet: fileSet1, index: new NumericRange(8, 11), sortOrder: 0 })
                        .select({
                            fileSet: fileSet1,
                            index: new NumericRange(13, 15),
                            sortOrder: 0,
                        })
                        .select({ fileSet: fileSet1, index: new NumericRange(22), sortOrder: 0 }),
                })
            ).to.equal(true);
        });

        it("deselects a file if it is the only one selected without setting updateExistingSelection", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection().select({
                        fileSet: fileSet1,
                        index: 12,
                        sortOrder: 0,
                    }),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile({ fileSet: fileSet1, selection: 12, sortOrder: 0 }));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection(),
                })
            ).to.equal(true);
        });

        it("does not deselect a file if not the only one selected without setting updateExistingSelection", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select({ fileSet: fileSet1, index: 12, sortOrder: 0 })
                        .select({ fileSet: fileSet2, index: 45, sortOrder: 1 }),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile({ fileSet: fileSet1, selection: 12, sortOrder: 0 }));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection().select({
                        fileSet: fileSet1,
                        index: 12,
                        sortOrder: 0,
                    }),
                })
            ).to.equal(true);
        });

        it("does not deselect a file if file is already selected and updateExistingSelection is true when file is part of a list of new selections", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select({
                            fileSet: fileSet2,
                            index: new NumericRange(27, 30),
                            sortOrder: 0,
                        })
                        .select({ fileSet: fileSet2, index: new NumericRange(22), sortOrder: 0 })
                        .select({
                            fileSet: fileSet1,
                            index: new NumericRange(8, 15),
                            sortOrder: 1,
                        }),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(
                selectFile({
                    fileSet: fileSet2,
                    selection: new NumericRange(22, 35),
                    sortOrder: 0,
                    updateExistingSelection: true,
                })
            );
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select({ fileSet: fileSet1, index: new NumericRange(8, 15), sortOrder: 1 })
                        .select({
                            fileSet: fileSet2,
                            index: new NumericRange(22, 35),
                            sortOrder: 0,
                        }),
                })
            ).to.equal(true);
        });
    });

    describe("selectNearbyFile", () => {
        const totalFileSize = 50;
        const responseStubs: ResponseStub[] = [
            {
                when: (config) => (config.url || "").includes(HttpFileService.BASE_FILE_COUNT_URL),
                respondWith: {
                    data: { data: [totalFileSize] },
                },
            },
        ];
        const fileExplorerServiceBaseUrl = FESBaseUrl.TEST;
        const mockHttpClient = createMockHttpClient(responseStubs);
        const fileService = new HttpFileService({
            fileExplorerServiceBaseUrl,
            httpClient: mockHttpClient,
            downloadService: new FileDownloadServiceNoop(),
        });
        const fileSet = new FileSet({ fileService: fileService });

        before(() => {
            sinon.stub(interaction.selectors, "getFileService").returns(fileService);
        });

        afterEach(() => {
            sinon.resetHistory();
        });

        after(() => {
            sinon.restore();
        });

        it("selects file above current focused row", async () => {
            // Arrange
            const state = mergeState(initialState, {
                selection: {
                    fileSelection: new FileSelection()
                        .select({
                            fileSet,
                            index: new NumericRange(8, 15),
                            sortOrder: 1,
                        })
                        .focusByFileSet(fileSet, 8),
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });
            const expectation = new FileSelection().select({
                fileSet,
                index: 7,
                sortOrder: 1,
            });

            // Act
            store.dispatch(selectNearbyFile("up", false));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: expectation,
                })
            ).to.be.true;
        });

        it("selects file below current focused row", async () => {
            // Arrange
            const fileSelection = new FileSelection().select({
                fileSet,
                index: new NumericRange(8, 15),
                sortOrder: 1,
            });
            const state = mergeState(initialState, {
                selection: {
                    fileSelection: new FileSelection().select({
                        fileSet,
                        index: new NumericRange(8, 15),
                        sortOrder: 1,
                    }),
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });
            const expectation = fileSelection.select({
                fileSet,
                index: 16,
                sortOrder: 1,
            });

            // Act
            store.dispatch(selectNearbyFile("down", true));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: expectation,
                })
            ).to.be.true;
        });

        it("does nothing if no file is currently selected", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: initialState,
            });

            // Act
            store.dispatch(selectNearbyFile("up", false));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                })
            ).to.be.false;
        });
    });

    describe("modifyAnnotationHierarchy", () => {
        let annotations: Annotation[];

        beforeEach(() => {
            annotations = annotationsJson.map((annotation) => new Annotation(annotation));
        });

        it("adds a new annotation to the end of the hierarchy", async () => {
            // setup
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 2).map((a) => a.name),
                    openFileFolders: [],
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(reorderAnnotationHierarchy(annotations[2].name, 2));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_ANNOTATION_HIERARCHY,
                    payload: [...annotations.slice(0, 2), annotations[2]].map((a) => a.name),
                })
            ).to.be.true;
        });

        it("moves an annotation within the hierarchy to a new position", async () => {
            // setup
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: [
                        annotations[0].name,
                        annotations[1].name,
                        annotations[2].name,
                        annotations[3].name,
                    ],
                    openFileFolders: [],
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(reorderAnnotationHierarchy(annotations[2].name, 0));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_ANNOTATION_HIERARCHY,
                    payload: [
                        annotations[2].name,
                        annotations[0].name,
                        annotations[1].name,
                        annotations[3].name,
                    ],
                })
            ).to.equal(true);
        });

        it("removes an annotation from the hierarchy", async () => {
            // setup

            // Create new Annotation entities rather than re-use existing
            // ones to test proper comparison using annotationName
            const annotationHierarchy = annotations.slice(0, 4).map((a) => a.name);
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy,
                    openFileFolders: [],
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(removeFromAnnotationHierarchy(annotations[2].name));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_ANNOTATION_HIERARCHY,
                    payload: [
                        annotationHierarchy[0],
                        annotationHierarchy[1],
                        annotationHierarchy[3],
                    ],
                })
            ).to.equal(true);
        });

        it("determines which paths can still be opened after hierarchy is reordered", async () => {
            // setup
            const openFileFolders = [
                new FileFolder(["AICS-0"]),
                new FileFolder(["AICS-0", "false"]),
            ];
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3).map((a) => a.name),
                    openFileFolders,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(reorderAnnotationHierarchy(annotations[2].name, 1));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_OPEN_FILE_FOLDERS,
                    payload: openFileFolders.slice(0, 1),
                })
            ).to.equal(true);
        });

        it("determines which paths can still be opened after annotation is added", async () => {
            // setup
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 2).map((a) => a.name),
                    openFileFolders: [
                        new FileFolder(["AICS-0"]),
                        new FileFolder(["AICS-0", "false"]),
                    ],
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(reorderAnnotationHierarchy(annotations[2].name, 0));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_OPEN_FILE_FOLDERS,
                    payload: [],
                })
            ).to.equal(true);
        });

        it("determines which paths can still be opened after annotation is removed", async () => {
            // setup
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3).map((a) => a.name),
                    openFileFolders: [
                        new FileFolder(["AICS-0"]),
                        new FileFolder(["AICS-0", "false"]),
                    ],
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(removeFromAnnotationHierarchy(annotations[0].name));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_OPEN_FILE_FOLDERS,
                    payload: [new FileFolder(["false"])],
                })
            ).to.equal(true);
        });
    });

    describe("changeDataSourceLogic", () => {
        it("dispatches refresh action", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                state: initialState,
                logics: selectionLogics,
            });

            // Act
            store.dispatch(changeDataSources([{}] as any[]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: interaction.actions.REFRESH,
                })
            ).to.be.true;
        });
    });

    describe("setAvailableAnnotationsLogics", () => {
        let annotations: Annotation[];

        beforeEach(() => {
            annotations = annotationsJson.map((annotation) => new Annotation(annotation));
        });

        it("sets available annotations", async () => {
            // Arrange
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3).map((a) => a.name),
                },
            });
            const responseStub = {
                when: () => true,
                respondWith: {
                    status: 200,
                    data: {
                        data: ["Cas9"],
                    },
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: selectionLogics,
                responseStubs: responseStub,
            });

            // Act
            store.dispatch(setAnnotationHierarchy(annotations.slice(0, 2).map((a) => a.name)));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: ["Cas9"],
                })
            );
        });

        it("sets all annotations as available when actual cannot be found", async () => {
            // Arrange
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3).map((a) => a.name),
                },
            });
            const responseStub = {
                when:
                    "test/file-explorer-service/1.0/annotations/hierarchy/available?hierarchy=date_created&hierarchy=cell_line",
                respondWith: {
                    status: 500,
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: selectionLogics,
                responseStubs: responseStub,
            });

            // Act
            store.dispatch(setAnnotationHierarchy(annotations.slice(0, 2).map((a) => a.name)));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: annotations.map((a) => a.name),
                })
            );
        });
    });

    describe("modifyFileFilters", () => {
        it("adds a new FileFilter to state", async () => {
            // setup
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: initialState,
            });
            const currentFilters = initialState.selection.filters;

            // act
            const filter = new FileFilter("foo", 2);
            store.dispatch(addFileFilter(filter));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_FILE_FILTERS,
                    payload: [filter, ...currentFilters],
                })
            ).to.equal(true);
        });

        it("removes a FileFilter from state", async () => {
            // setup
            const filterToRemove = new FileFilter("foo", 2);
            const filterToKeep = new FileFilter("bar", 3);
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: {
                    ...initialState,
                    selection: {
                        ...initialState.selection,
                        filters: [filterToRemove, filterToKeep],
                    },
                },
            });

            // act
            store.dispatch(removeFileFilter(filterToRemove));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_FILE_FILTERS,
                    payload: [filterToKeep],
                })
            ).to.equal(true);
        });

        it("adds many FileFilters to state", async () => {
            // setup
            const filterToKeep = new FileFilter("bar", 3);
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: {
                    ...initialState,
                    selection: {
                        ...initialState.selection,
                        filters: [filterToKeep],
                    },
                },
            });

            // act
            const filters = [new FileFilter("foo", 2), new FileFilter("foo", 10)];
            store.dispatch(addFileFilter(filters));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_FILE_FILTERS,
                    payload: [filterToKeep, ...filters],
                })
            ).to.equal(true);
        });

        it("removes many FileFilters from state", async () => {
            // setup
            const filterToKeep = new FileFilter("bar", 3);
            const filtersToRemove = [new FileFilter("foo", 2), new FileFilter("foo", 10)];
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: {
                    ...initialState,
                    selection: {
                        ...initialState.selection,
                        filters: [filterToKeep, ...filtersToRemove],
                    },
                },
            });

            // act
            store.dispatch(removeFileFilter(filtersToRemove));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_FILE_FILTERS,
                    payload: [filterToKeep],
                })
            ).to.equal(true);
        });

        it("does nothing if the net result would have no impact", async () => {
            // setup
            const filtersToKeep = [
                new FileFilter("arg", 10),
                new FileFilter("bar", 3),
                new FileFilter("bar", 4),
            ];
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: {
                    ...initialState,
                    selection: {
                        ...initialState.selection,
                        filters: [...filtersToKeep],
                    },
                },
            });

            // act
            store.dispatch(addFileFilter(shuffle(filtersToKeep)));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_FILTERS,
                })
            ).to.equal(false);
        });
    });

    describe("toggleAllFileFolders", () => {
        const annotationHierarchy = annotationsJson.slice(0, 2).map((a) => a.annotationDisplayName);
        const mockRootValues = [`${annotationHierarchy[0]}1`, `${annotationHierarchy[0]}2`];
        const mockLeafValues = [
            `${annotationHierarchy[1]}1`,
            `${annotationHierarchy[1]}2`,
            `${annotationHierarchy[1]}3`,
        ];

        const responseStubs = [
            {
                when: (config: any) =>
                    _get(config, "url", "").includes(
                        HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL
                    ),
                respondWith: {
                    data: { data: mockRootValues },
                },
            },
            {
                when: (config: any) =>
                    _get(config, "url", "").includes(
                        `${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}`
                    ),
                respondWith: {
                    data: { data: mockLeafValues },
                },
            },
        ];
        const mockHttpClient = createMockHttpClient(responseStubs);
        const annotationService = new HttpAnnotationService({
            fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
            httpClient: mockHttpClient,
        });

        beforeEach(() => {
            sinon.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
        });

        afterEach(() => {
            sinon.restore();
        });

        it("dispatches empty array for collapse all folders actions", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: initialState,
            });
            // not evergreen
            expect(
                actions.includesMatch({
                    type: SET_OPEN_FILE_FOLDERS,
                    payload: [],
                })
            ).to.be.false;

            // Act
            store.dispatch(collapseAllFileFolders());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_OPEN_FILE_FOLDERS,
                    payload: [],
                })
            ).to.be.true;
        });

        it("dispatches all array combinations for expand all folders actions", async () => {
            // Arrange
            const state = mergeState(initialState, {
                selection: {
                    annotationHierarchy,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });
            const expectedFilePaths = [
                ...mockRootValues.map((value) => new FileFolder([value])),
                ...mockRootValues.map((rootValue) =>
                    mockLeafValues.map((leafValue) => new FileFolder([rootValue, leafValue]))
                ),
            ];

            // Act
            store.dispatch(expandAllFileFolders());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_OPEN_FILE_FOLDERS,
                })
            ).to.be.true;
            const setOpenFileFoldersAction = actions.list.find(
                (element) => element.type === SET_OPEN_FILE_FOLDERS
            );
            // Verify action payload contains exact same elements as expectedFilePaths regardless of order
            expect(
                setOpenFileFoldersAction?.payload.every((filePath: FileFolder) =>
                    expectedFilePaths.includes(filePath)
                )
            );
            expect(
                expectedFilePaths.every((filePath) =>
                    setOpenFileFoldersAction?.payload.includes(filePath)
                )
            );
        });
    });

    describe("decodeFileExplorerURL", () => {
        const mockDataSources: DataSource[] = [
            {
                id: "1234148",
                name: "Test Data Source",
                version: 1,
                type: "csv",
            },
        ];

        beforeEach(() => {
            const datasetService = new DatasetService();
            sinon.stub(interaction.selectors, "getDatasetService").returns(datasetService);
        });

        afterEach(() => {
            sinon.restore();
        });

        it("dispatches new hierarchy, filters, sort, source, & opened folders from given URL", async () => {
            // Arrange
            const annotations = annotationsJson.map((annotation) => new Annotation(annotation));
            class MockDatabaseService extends DatabaseServiceNoop {
                public deleteSourceMetadata(): Promise<void> {
                    return Promise.resolve();
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        databaseService: new MockDatabaseService(),
                    },
                },
                metadata: {
                    annotations,
                    dataSources: mockDataSources,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });
            const hierarchy = annotations.slice(0, 2).map((a) => a.name);
            const filters = [new FileFilter(annotations[3].name, "20x")];
            const openFolders = [["a"], ["a", false]].map((folder) => new FileFolder(folder));
            const sortColumn = new FileSort(AnnotationName.UPLOADED, SortOrder.DESC);
            const encodedURL = FileExplorerURL.encode({
                hierarchy,
                filters,
                openFolders,
                sortColumn,
                sources: mockDataSources,
            });

            // Act
            store.dispatch(decodeFileExplorerURL(encodedURL));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_ANNOTATION_HIERARCHY,
                    payload: hierarchy,
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_FILE_FILTERS,
                    payload: filters,
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_OPEN_FILE_FOLDERS,
                    payload: openFolders,
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_SORT_COLUMN,
                    payload: sortColumn,
                })
            ).to.be.true;
            expect(actions.includesMatch(changeSourceMetadata())).to.be.true;
            expect(actions.includesMatch(changeDataSources(mockDataSources))).to.be.true;
        });
    });
});
