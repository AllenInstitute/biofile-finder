import { expect } from "chai";

import Annotation from "../";

describe("Annotation", () => {
    const annotationResponse = Object.freeze({
        annotation_display_name: "Date created",
        annotation_name: "created_on",
        description: "Date the file was created on",
        type: "Date/Time",
        values: [],
    });

    describe("getDisplayValue", () => {
        it("gets the display value for a top-level annotation it represents from a given FmsFile", () => {
            const fmsFile = {
                created_on: "2019-05-17T07:43:55.205Z",
                file_id: "abc123",
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.getDisplayValue(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("gets the display value for a non-top-level annotation it represents from a given FmsFile", () => {
            const fmsFile = {
                file_id: "abc123",
                annotations: [
                    {
                        annotation_name: "created_on",
                        values: ["2019-05-17T07:43:55.205Z"],
                    },
                ],
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.getDisplayValue(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("returns a MISSING_VALUE sentinel if the given FmsFile does not have the annotation", () => {
            const fmsFile = {
                file_id: "abc123",
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.getDisplayValue(fmsFile)).to.equal(Annotation.MISSING_VALUE);
        });
    });
});
