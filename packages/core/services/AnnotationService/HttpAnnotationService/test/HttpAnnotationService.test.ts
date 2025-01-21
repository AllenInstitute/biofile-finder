import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";
import { spy } from "sinon";

import { TOP_LEVEL_FILE_ANNOTATION_NAMES, FESBaseUrl } from "../../../../constants";
import Annotation from "../../../../entity/Annotation";
import { annotationsJson } from "../../../../entity/Annotation/mocks";
import FileFilter from "../../../../entity/FileFilter";

import HttpAnnotationService from "..";

describe("HttpAnnotationService", () => {
    describe("fetchAnnotations", () => {
        const httpClient = createMockHttpClient({
            when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_URL}`,
            respondWith: {
                data: {
                    data: annotationsJson,
                },
            },
        });

        it("issues request for all available Annotations", async () => {
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const annotations = await annotationService.fetchAnnotations();
            expect(annotations.length).to.equal(
                annotationsJson.length + TOP_LEVEL_FILE_ANNOTATION_NAMES.length
            );
            expect(annotations[0]).to.be.instanceOf(Annotation);
        });

        it("renames Cache Eviction Date to VAST Expiration Date", async () => {
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const annotations = await annotationService.fetchAnnotations();
            const localPathAnnotation = annotations.find((a) => a.name === "Cache Eviction Date");
            expect(localPathAnnotation?.displayName).to.equal("VAST Expiration Date");
        });
    });

    describe("fetchAnnotationValues", () => {
        it("issues request for all available Annotations", async () => {
            const annotation = "foo";
            const values = ["a", "b", "c"];
            const httpClient = createMockHttpClient({
                when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_URL}/${annotation}/values`,
                respondWith: {
                    data: {
                        data: values,
                    },
                },
            });

            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const actualValues = await annotationService.fetchValues(annotation);
            expect(actualValues.length).to.equal(values.length);
            expect(actualValues).to.be.deep.equal(values);
        });
    });

    describe("fetchRootHierarchyValues", () => {
        it("issues a request for annotation values for the first level of the annotation hierarchy", async () => {
            const expectedValues = ["foo", "bar", "baz"];
            const httpClient = createMockHttpClient({
                when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?order=foo`,
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });

            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const values = await annotationService.fetchRootHierarchyValues(["foo"], []);
            expect(values).to.equal(expectedValues);
        });

        it("does not re-issue request for the same annotation values (independence of ordering of tail of hierarchy)", async () => {
            const expectedValues = ["foo", "bar", "baz"];
            const httpClient = createMockHttpClient({
                // note order of query params
                when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?order=z&order=a&order=b&order=c`,
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });
            const getSpy = spy(httpClient, "get");

            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });

            // first time around
            const firstCallRet = await annotationService.fetchRootHierarchyValues(
                ["z", "a", "b", "c"],
                []
            ); // note order
            expect(firstCallRet).to.equal(expectedValues);
            expect(getSpy.called).to.equal(true);

            // reset spy
            getSpy.resetHistory();

            // call again, with tail of hierarchy reordered
            const secondCallRet = await annotationService.fetchRootHierarchyValues(
                ["z", "c", "a", "b"],
                []
            ); // note order
            expect(secondCallRet).to.equal(firstCallRet);
            expect(getSpy.called).to.equal(false);
        });

        it("issues a request for annotation values for the first level of the annotation hierarchy with filters", async () => {
            const expectedValues = ["foo", "barValue", "baz"];
            const httpClient = createMockHttpClient({
                when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?order=foo&filter=bar=barValue`,
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });

            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const filter = new FileFilter("bar", "barValue");
            const values = await annotationService.fetchRootHierarchyValues(["foo"], [filter]);
            expect(values).to.equal(expectedValues);
        });
    });

    describe("fetchHierarchyValuesUnderPath", () => {
        it("issues request for hierarchy values under a specific path within the hierarchy", async () => {
            const expectedValues = [1, 2, 3];
            const httpClient = createMockHttpClient({
                when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}?order=foo&order=bar&path=baz`,
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });

            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const values = await annotationService.fetchHierarchyValuesUnderPath(
                ["foo", "bar"],
                ["baz"],
                []
            );
            expect(values).to.equal(expectedValues);
        });

        it("issues request for hierarchy values under a specific path within the hierarchy with filters", async () => {
            const expectedValues = [1, "barValue", 3];
            const httpClient = createMockHttpClient({
                when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}?order=foo&order=bar&path=baz&filter=bar=barValue`,
                respondWith: {
                    data: {
                        data: expectedValues,
                    },
                },
            });

            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const filter = new FileFilter("bar", "barValue");
            const values = await annotationService.fetchHierarchyValuesUnderPath(
                ["foo", "bar"],
                ["baz"],
                [filter]
            );
            expect(values).to.equal(expectedValues);
        });
    });

    describe("fetchAvailableAnnotationsForHierarchy", () => {
        it("issues request for annotations that can be combined with current hierarchy", async () => {
            const annotationsFromServer = ["cell_dead", "date_created"];
            const httpClient = createMockHttpClient({
                when: `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_URL}/hierarchy/available?hierarchy=cas9&hierarchy=cell_line`,
                respondWith: {
                    data: {
                        data: annotationsFromServer,
                    },
                },
            });

            const hierarchy = ["cell_line", "cas9"];
            const expectedValues = [
                ...TOP_LEVEL_FILE_ANNOTATION_NAMES,
                ...annotationsFromServer,
                ...hierarchy,
            ];
            const annotationService = new HttpAnnotationService({
                fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
                httpClient,
            });
            const values = await annotationService.fetchAvailableAnnotationsForHierarchy(hierarchy);
            expect(values.sort()).to.deep.equal(expectedValues.sort());
        });
    });
});
