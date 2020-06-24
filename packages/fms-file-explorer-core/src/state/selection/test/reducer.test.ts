import { configureMockStore } from "@aics/redux-utils";
import { expect } from "chai";

import { selectFile } from "../actions";
import selectionLogics from "../logics";
import selectionReducer from "../reducer";

describe("Selection reducer", () => {
    describe("SELECT_FILE", () => {
        it("adds file indices when file indices are selected", async () => {
            // setup
            const state = {
                selection: {
                    selectedFileIndicesByFileSet: {
                        abc123: [5],
                    },
                },
            };
            const { store, logicMiddleware } = configureMockStore({
                logics: selectionLogics,
                reducer: selectionReducer,
                state,
            });

            // act
            store.dispatch(selectFile("abc123", 5));
            await logicMiddleware.whenComplete();

            // assert
            expect(store.getState().selection.selectedFileIndicesByFileSet).to.deep.equal({
                abc123: [5],
            });
        });

        it("removes file set after deselecting last index in set", async () => {
            // setup
            const state = {
                selection: {
                    selectedFileIndicesByFileSet: {
                        abc123: [5],
                    },
                },
            };
            const { store, logicMiddleware } = configureMockStore({
                logics: selectionLogics,
                state,
            });

            // act
            store.dispatch(selectFile("abc123", 5, true));
            await logicMiddleware.whenComplete();

            // assert
            expect(store.getState().selection.selectedFileIndicesByFileSet).to.deep.equal({});
        });
    });
});
