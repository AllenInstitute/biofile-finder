import { configureMockStore } from "@aics/redux-utils";
import { expect } from "chai";
import { shuffle } from "lodash";

import {
    addFileFilter,
    SELECT_FILE,
    selectFile,
    reorderAnnotationHierarchy,
    SET_ANNOTATION_HIERARCHY,
    SET_FILE_FILTERS,
    removeFileFilter,
    removeFromAnnotationHierarchy,
} from "../actions";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import selectionLogics from "../logics";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import { initialState } from "../../";

describe("Selection logics", () => {
    describe("selectFile", () => {
        it("does not include existing file selections when updateExistingSelection is false", async () => {
            // setup
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
            });

            // act
            store.dispatch(selectFile("abc123", 5));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        correspondingFileSet: "abc123",
                        fileIndex: [5],
                    },
                })
            ).to.equal(true);
        });

        it("appends newly selected file to existing selections when updateExistingSelection is true", async () => {
            // setup
            const state = {
                selection: {
                    selectedFilesByFileSet: {
                        abc123: [9],
                    },
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile("abc123", 14, true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        correspondingFileSet: "abc123",
                        fileIndex: [9, 14],
                    },
                })
            ).to.equal(true);
        });

        it("deselects a file if file is already selected and updateExistingSelection is true", async () => {
            // setup
            const state = {
                selection: {
                    selectedFilesByFileSet: {
                        abc123: [8, 22],
                    },
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile("abc123", 22, true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        correspondingFileSet: "abc123",
                        fileIndex: [8],
                    },
                })
            ).to.equal(true);
        });

        it("does not deselect a file if file is already selected and updateExistingSelection is true when file is part of a list of new selections", async () => {
            // setup
            const state = {
                selection: {
                    selectedFilesByFileSet: {
                        abc123: [8, 22],
                    },
                },
            };
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile("abc123", [8, 44], true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        correspondingFileSet: "abc123",
                        fileIndex: [8, 22, 44],
                    },
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
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 2),
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
