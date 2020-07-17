import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import { RECEIVE_ANNOTATIONS, requestAnnotations, requestAnnotationValues } from "../actions";
import metadataLogics from "../logics";
import { initialState } from "../../";
import Annotation from "../../../entity/Annotation";

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

    describe("requestAnnotationValues", () => {
        it("Fires RECEIVE_ANNOTATIONS action after processing REQUEST_ANNOTATION_VALUES action", async () => {
            // setup
            const initialAnnotations = [
                new Annotation({
                    annotationDisplayName: "Foo",
                    annotationName: "foo",
                    description: "foo annotation",
                    type: "Text",
                    values: [],
                }),
                new Annotation({
                    annotationDisplayName: "Bar",
                    annotationName: "bar",
                    description: "bar annotation",
                    type: "Text",
                    values: [],
                }),
            ];
            const state = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: "test",
                },
                metadata: {
                    annotations: initialAnnotations,
                },
            });

            const annotationName = "foo";
            const expectedValues = ["a", "b", "c", "d"];
            const expectedAnnotations = initialAnnotations.map((a) => {
                if (a.name === annotationName) {
                    return new Annotation({
                        annotationDisplayName: a.displayName,
                        annotationName: a.name,
                        description: a.description,
                        type: a.type,
                        values: expectedValues,
                    });
                }
                return a;
            });
            const responseStub = {
                when: `test/file-explorer-service/1.0/annotations/${annotationName}/values`,
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            };

            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: metadataLogics,
                responseStubs: responseStub,
            });

            // do
            store.dispatch(requestAnnotationValues(annotationName));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    payload: expectedAnnotations,
                    type: RECEIVE_ANNOTATIONS,
                })
            ).to.equal(true);
        });
    });
});
