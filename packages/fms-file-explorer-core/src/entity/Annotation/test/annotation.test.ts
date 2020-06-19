import { expect } from "chai";

import Annotation from "../";
import { AnnotationType } from "../../AnnotationFormatter";
import { makeFileDetailMock } from "../../FileDetail/mocks";

describe("Annotation", () => {
    const annotationResponse = Object.freeze({
        annotationDisplayName: "Date uploaded",
        annotationName: "someDateAnnotation",
        description: "Date the file was uploaded",
        type: AnnotationType.DATETIME,
        values: [],
    });

    describe("extractFromFile", () => {
        it("gets the display value for a top-level annotation it represents from a given FmsFile", () => {
            const fmsFile = {
                ...makeFileDetailMock("abc123"),
                someDateAnnotation: "2019-05-17T07:43:55.205Z",
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("gets the display value for a non-top-level annotation it represents from a given FmsFile", () => {
            const fmsFile = {
                ...makeFileDetailMock("abc123"),
                annotations: [
                    {
                        name: "someDateAnnotation",
                        values: ["2019-05-17T07:43:55.205Z"],
                    },
                ],
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("returns a MISSING_VALUE sentinel if the given FmsFile does not have the annotation", () => {
            const fmsFile = makeFileDetailMock("abc123");

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal(Annotation.MISSING_VALUE);
        });
    });
});
