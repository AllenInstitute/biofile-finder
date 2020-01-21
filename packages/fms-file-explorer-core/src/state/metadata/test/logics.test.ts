import { configureMockStore } from "@aics/redux-utils";
import { expect } from "chai";

import { RECEIVE_ANNOTATIONS, requestAnnotations } from "../actions";
import metadataLogics from "../logics";

describe("Metadata logics", () => {
    describe("requestAnnotations", () => {
        it("Fires RECEIVE_ANNOTATIONS action after processing REQUEST_ANNOTATIONS action", async () => {
            // setup
            const { store, logicMiddleware, actions } = configureMockStore({
                logics: metadataLogics,
            });

            // do
            store.dispatch(requestAnnotations());
            await logicMiddleware.whenComplete();

            // assert
            expect(actions.includesMatch({ type: RECEIVE_ANNOTATIONS })).to.equal(true);
        });
    });
});
