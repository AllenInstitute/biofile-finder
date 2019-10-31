import { expect } from "chai";

import createMockReduxStore from "../../test/mock-redux-store";
import { SELECT_FILE, selectFile } from "../actions";

describe("Selection logics", () => {
    describe("selectFile", () => {
        it("does not include existing file selections when append is false", async () => {
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

        it("appends newly selected file to existing selections when append is true", async () => {
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
    });
});
