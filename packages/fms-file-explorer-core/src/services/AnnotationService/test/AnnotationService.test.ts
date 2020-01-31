import { createMockHttpClient } from "@aics/redux-utils";
import { expect } from "chai";

import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import AnnotationService from "..";

describe("AnnotationService", () => {
    const httpClient = createMockHttpClient({
        when: "test/file-explorer-service/1.0/annotations",
        respondWith: {
            data: {
                data: annotationsJson,
            },
        },
    });

    describe("fetchAnnotations", () => {
        it("issues request for all available Annotations", async () => {
            const annotationService = new AnnotationService({ baseUrl: "test", httpClient });
            const annotations = await annotationService.fetchAnnotations();
            expect(annotations.length).to.equal(annotationsJson.length);
            expect(annotations[0]).to.be.instanceOf(Annotation);
        });
    });
});
