import { expect } from "chai";

import createMockReduxStore from "../../test/mock-redux-store";
import { DESELECT_FILE, SELECT_FILE, selectFile } from "../actions";

describe("Selection logics", () => {
    describe("selectFile", () => {
        it("does not include existing file selections when updateExistingSelection is false", async () => {
            // setup
            const [store, logicMiddleware, actions] = createMockReduxStore();

            // act
            store.dispatch(selectFile("abc123"));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        file: ["abc123"],
                    },
                })
            ).to.equal(true);
        });

        it("appends newly selected file to existing selections when updateExistingSelection is true", async () => {
            // setup
            const mockState = {
                selection: {
                    selectedFiles: ["abc123"],
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(selectFile("xyz789", true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        file: ["abc123", "xyz789"],
                    },
                })
            ).to.equal(true);
        });

        it("deselects a file if file is already selected and updateExistingSelection is true", async () => {
            // setup
            const mockState = {
                selection: {
                    selectedFiles: ["abc123", "xyz789"],
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(selectFile("xyz789", true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: DESELECT_FILE,
                    payload: "xyz789",
                })
            ).to.equal(true);
        });
    });
});
