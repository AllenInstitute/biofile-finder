import { expect } from "chai";
import { createSandbox, SinonSandbox, spy } from "sinon";

import Annotation from "../";
import AnnotationService from "../../../services/AnnotationService";

describe("Annotation", () => {
    const annotationResponse = Object.freeze({
        annotation_display_name: "Date created",
        annotation_name: "created_on",
        description: "Date the file was created on",
        type: "date/time",
    });

    describe("getDisplayValue", () => {
        it("gets the display value for the annotation it represents from a given FmsFile", () => {
            const fmsFile = {
                created_on: "2019-05-17T07:43:55.205Z",
                file_id: "abc123",
                file_index: 2,
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.getDisplayValue(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("returns a MISSING_VALUE sentinel if the given FmsFile does not have the annotation", () => {
            const fmsFile = {
                file_id: "abc123",
                file_index: 2,
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.getDisplayValue(fmsFile)).to.equal(Annotation.MISSING_VALUE);
        });
    });

    describe("getValues", () => {
        let sandbox: SinonSandbox;

        before(() => {
            sandbox = createSandbox();
        });

        afterEach(() => {
            if (sandbox) {
                sandbox.reset();
            }
        });

        it("does not re-fetch annotation values if they are already loaded", async () => {
            const annotationService = new AnnotationService();
            const dates = [
                new Date().toUTCString(),
                new Date().toUTCString(),
                new Date().toUTCString(),
            ];

            const fetchStub = sandbox
                .stub(annotationService, "fetchValues")
                .callsFake(() => Promise.resolve(dates));
            const annotation = new Annotation(annotationResponse, annotationService);

            // before
            expect(fetchStub.callCount).to.equal(0);

            // get values
            expect(await annotation.getValues()).to.equal(dates);
            expect(fetchStub.callCount).to.equal(1);

            // get values again, still expect fetchStub to only have been called once
            expect(await annotation.getValues()).to.equal(dates);
            expect(fetchStub.callCount).to.equal(1);
        });
    });
});
