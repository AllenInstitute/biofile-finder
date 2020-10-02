import { configureMockStore } from "@aics/redux-utils";
import { expect } from "chai";
import { shuffle } from "lodash";

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
} from "../actions";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import selectionLogics from "../logics";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import { initialState } from "../../";
import NumericRange from "../../../entity/NumericRange";
import FileFolder from "../../../entity/FileFolder";
import FileSet from "../../../entity/FileSet";
import FileSelection from "../../../entity/FileSelection";

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
                        .select(fileSet1, 3)
                        .select(fileSet2, 99),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile(fileSet1, 5));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection().select(fileSet1, 5),
                })
            ).to.equal(true);
        });

        it("appends newly selected file to existing selections when updateExistingSelection is true -- discontinuous selections", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select(fileSet1, 9),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile(fileSet1, 14, true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select(fileSet1, 9)
                        .select(fileSet1, 14),
                })
            ).to.equal(true);
        });

        it("preserves past selections when updateExistingSelection is true and new selection is a range", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select(fileSet1, new NumericRange(9, 15))
                        .select(fileSet2, new NumericRange(100, 200)),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile(fileSet1, new NumericRange(20, 100), true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select(fileSet1, new NumericRange(9, 15))
                        .select(fileSet2, new NumericRange(100, 200))
                        .select(fileSet1, new NumericRange(20, 100)),
                })
            ).to.equal(true);
        });

        it("deselects a file if file is already selected and updateExistingSelection is true", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select(fileSet1, new NumericRange(8, 15))
                        .select(fileSet1, 22),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile(fileSet1, 12, true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select(fileSet1, new NumericRange(8, 11))
                        .select(fileSet1, new NumericRange(13, 15))
                        .select(fileSet1, new NumericRange(22)),
                })
            ).to.equal(true);
        });

        it("deselects a file if it is the only one selected without setting updateExistingSelection", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select(fileSet1, 12),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile(fileSet1, 12));
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
                        .select(fileSet1, 12)
                        .select(fileSet2, 45),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile(fileSet1, 12));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select(fileSet1, 12),
                })
            ).to.equal(true);
        });

        it("does not deselect a file if file is already selected and updateExistingSelection is true when file is part of a list of new selections", async () => {
            // setup
            const state = {
                selection: {
                    fileSelection: new FileSelection()
                        .select(fileSet2, new NumericRange(27, 30))
                        .select(fileSet2, new NumericRange(22))
                        .select(fileSet1, new NumericRange(8, 15)),
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile(fileSet2, new NumericRange(22, 35), true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_FILE_SELECTION,
                    payload: new FileSelection()
                        .select(fileSet1, new NumericRange(8, 15))
                        .select(fileSet2, new NumericRange(22, 35)),
                })
            ).to.equal(true);
        });
    });

    describe("modifyAnnotationHierarchy", () => {
        let annotations: Annotation[];

        beforeEach(() => {
            annotations = annotationsJson.map((annotation) => new Annotation(annotation));
        });

        it("adds a new annotation to the end of the hierarchy", async () => {
            // setup
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 2),
                    openFileFolders: [],
                },
            };
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
                    payload: [...annotations.slice(0, 2), annotations[2]],
                })
            ).to.equal(true);
        });

        it("moves an annotation within the hierarchy to a new position", async () => {
            // setup
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: [
                        annotations[0],
                        annotations[1],
                        annotations[2],
                        annotations[3],
                    ],
                    openFileFolders: [],
                },
            };
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
                    payload: [annotations[2], annotations[0], annotations[1], annotations[3]],
                })
            ).to.equal(true);
        });

        it("removes an annotation from the hierarchy", async () => {
            // setup
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: [
                        annotations[0],
                        annotations[1],
                        annotations[2],
                        annotations[3],
                    ],
                    openFileFolders: [],
                },
            };
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
                    payload: [annotations[0], annotations[1], annotations[3]],
                })
            ).to.equal(true);
        });

        it("sets available annotations based on hierarchy", async () => {
            // setup
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: [
                        annotations[0],
                        annotations[1],
                        annotations[2],
                        annotations[3],
                    ],
                    openFileFolders: [],
                },
            };

            const responseStub = {
                when:
                    "test/file-explorer-service/1.0/annotations/hierarchy/available?hierarchy=cell_line&hierarchy=date_created&hierarchy=matrigel_hardened",
                respondWith: {
                    data: {
                        data: ["days_since_creation"],
                    },
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                responseStubs: responseStub,
                state,
            });

            // act
            store.dispatch(removeFromAnnotationHierarchy(annotations[2].name));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: ["days_since_creation"],
                })
            ).to.equal(true);
        });

        it("sets all annotations as available on failure to determine actual available annotations", async () => {
            // setup
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: [
                        annotations[0],
                        annotations[1],
                        annotations[2],
                        annotations[3],
                    ],
                    openFileFolders: [],
                },
            };

            const responseStub = {
                when:
                    "test/file-explorer-service/1.0/annotations/hierarchy/available?hierarchy=cell_line&hierarchy=date_created&hierarchy=matrigel_hardened",
                respondWith: {
                    status: 500,
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                responseStubs: responseStub,
                state,
            });

            // act
            store.dispatch(removeFromAnnotationHierarchy(annotations[2].name));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: annotations.map((a) => a.name),
                })
            ).to.equal(true);
        });

        it("determines which paths can still be opened after hierarchy is reordered", async () => {
            // setup
            const openFileFolders = [
                new FileFolder(["AICS-0"]),
                new FileFolder(["AICS-0", "false"]),
            ];
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3),
                    openFileFolders,
                },
            };
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
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 2),
                    openFileFolders: [
                        new FileFolder(["AICS-0"]),
                        new FileFolder(["AICS-0", "false"]),
                    ],
                },
            };
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
            const state = {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3),
                    openFileFolders: [
                        new FileFolder(["AICS-0"]),
                        new FileFolder(["AICS-0", "false"]),
                    ],
                },
            };
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

    describe("modifyFileFilters", () => {
        it("adds a new FileFilter to state", async () => {
            // setup
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state: initialState,
            });

            // act
            const filter = new FileFilter("foo", 2);
            store.dispatch(addFileFilter(filter));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: SET_FILE_FILTERS,
                    payload: [filter],
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
});
