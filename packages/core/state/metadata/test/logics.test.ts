import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import { RECEIVE_ANNOTATIONS, requestAnnotations } from "../actions";
import metadataLogics from "../logics";
import { initialState, selection } from "../../";

describe("Metadata logics", () => {
    describe("requestAnnotations", () => {
        it("Fires RECEIVE_ANNOTATIONS and SELECT_DISPLAY_ANNOTATION actions after processing REQUEST_ANNOTATIONS action", async () => {
            // arrange
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

            // act
            store.dispatch(requestAnnotations());
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatchesInOrder([
                    { type: RECEIVE_ANNOTATIONS },
                    { type: selection.actions.SELECT_DISPLAY_ANNOTATION },
                ])
            ).to.equal(true);
        });
    });
});
