import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import { RECEIVE_ANNOTATIONS, requestAnnotations } from "../actions";
import metadataLogics from "../logics";
import { initialState } from "../../";

describe("Metadata logics", () => {
    describe("requestAnnotations", () => {
        it("Fires RECEIVE_ANNOTATIONS action after processing REQUEST_ANNOTATIONS action", async () => {
            // setup
            const state = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
            });

            const responseStub = {
                when: "test/file-explorer-service/1.0/annotations",
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

            // do
            store.dispatch(requestAnnotations());
            await logicMiddleware.whenComplete();

            // assert
            expect(actions.includesMatch({ type: RECEIVE_ANNOTATIONS })).to.equal(true);
        });
    });
});
