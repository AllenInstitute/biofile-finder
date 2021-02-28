import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import { spy } from "sinon";

import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import AnnotationService from "..";

describe("AnnotationService", () => {
    describe("fetchAnnotations", () => {
        const httpClient = createMockHttpClient({
            when: "test/file-explorer-service/1.0/annotations",
            respondWith: {
                data: {
                    data: annotationsJson,
                },
            },
        });

        it("issues request for all available Annotations", async () => {
            const annotationService = new AnnotationService({ baseUrl: "test", httpClient });
            const annotations = await annotationService.fetchAnnotations();
            expect(annotations.length).to.equal(annotationsJson.length);
            expect(annotations[0]).to.be.instanceOf(Annotation);
        });
    });

    describe("fetchAnnotationValues", () => {
        it("issues request for all available Annotations", async () => {
            const annotation = "foo";
            const values = ["a", "b", "c"];
            const httpClient = createMockHttpClient({
                when: `test/file-explorer-service/1.0/annotations/${annotation}/values`,
                respondWith: {
                    data: {
                        data: values,
                    },
                },
            });

            const annotationService = new AnnotationService({ baseUrl: "test", httpClient });
            const actualValues = await annotationService.fetchValues(annotation);
            expect(actualValues.length).to.equal(values.length);
            expect(actualValues).to.be.deep.equal(values);
        });
    });

    describe("fetchRootHierarchyValues", () => {
        it("issues a request for annotation values for the first level of the annotation hierarchy", async () => {
            const expectedValues = ["foo", "bar", "baz"];
            const httpClient = createMockHttpClient({
                when: "test/file-explorer-service/1.0/annotations/hierarchy/root?order=foo",
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });

            const annotationService = new AnnotationService({ baseUrl: "test", httpClient });
            const values = await annotationService.fetchRootHierarchyValues(["foo"]);
            expect(values).to.equal(expectedValues);
        });

        it("does not re-issue request for the same annotation values (independence of ordering of tail of hierarchy)", async () => {
            const expectedValues = ["foo", "bar", "baz"];
            const httpClient = createMockHttpClient({
                // note order of query params
                when:
                    "test/file-explorer-service/1.0/annotations/hierarchy/root?order=z&order=a&order=b&order=c",
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });
            const getSpy = spy(httpClient, "get");

            const annotationService = new AnnotationService({ baseUrl: "test", httpClient });

            // first time around
            const firstCallRet = await annotationService.fetchRootHierarchyValues([
                "z",
                "a",
                "b",
                "c",
            ]); // note order
            expect(firstCallRet).to.equal(expectedValues);
            expect(getSpy.called).to.equal(true);

            // reset spy
            getSpy.resetHistory();

            // call again, with tail of hierarchy reordered
            const secondCallRet = await annotationService.fetchRootHierarchyValues([
                "z",
                "c",
                "a",
                "b",
            ]); // note order
            expect(secondCallRet).to.equal(firstCallRet);
            expect(getSpy.called).to.equal(false);
        });
    });

    describe("fetchHierarchyValuesUnderPath", () => {
        it("issues request for hierarchy values under a specific path within the hierarchy", async () => {
            const expectedValues = [1, 2, 3];
            const httpClient = createMockHttpClient({
                when:
                    "test/file-explorer-service/1.0/annotations/hierarchy/under-path?order=foo&order=bar&path=baz",
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });

            const annotationService = new AnnotationService({ baseUrl: "test", httpClient });
            const values = await annotationService.fetchHierarchyValuesUnderPath(
                ["foo", "bar"],
                ["baz"]
            );
            expect(values).to.equal(expectedValues);
        });
    });

    describe("fetchAvailableAnnotationsForHierarchy", () => {
        it("issues request for annotations that can be combined with current hierarchy", async () => {
            const expectedValues = ["cell_dead", "date_created"];
            const httpClient = createMockHttpClient({
                when:
                    "test/file-explorer-service/1.0/annotations/hierarchy/available?hierarchy=cas9&hierarchy=cell_line",
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });

            const annotationService = new AnnotationService({ baseUrl: "test", httpClient });
            const values = await annotationService.fetchAvailableAnnotationsForHierarchy([
                "cell_line",
                "cas9",
            ]);
            expect(values).to.equal(expectedValues);
        });
    });
});
