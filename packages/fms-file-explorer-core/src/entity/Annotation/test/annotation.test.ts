import { expect } from "chai";

import Annotation from "../";
import { AnnotationType } from "../../AnnotationFormatter";

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
                annotations: [
                    {
                        name: "someDateAnnotation",
                        values: ["2019-05-17T07:43:55.205Z"],
                    },
                ],
                channels: [],
                fileId: "abc123",
                fileName: "mockfile.png",
                filePath: "some/path/to/mockfile.png",
                fileSize: 1,
                fileType: "png",
                positions: [],
                someDateAnnotation: "2019-05-17T07:43:55.205Z",
                times: [],
                thumbnailPath:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
                uploadedBy: "Her",
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("gets the display value for a non-top-level annotation it represents from a given FmsFile", () => {
            const fmsFile = {
                annotations: [
                    {
                        name: "someDateAnnotation",
                        values: ["2019-05-17T07:43:55.205Z"],
                    },
                ],
                channels: [{ id: 1 }, { id: 2 }],
                fileId: "abc123",
                fileName: "mockfile.text",
                filePath: "some/path/to/mockfile.png",
                fileSize: 1,
                fileType: "text",
                positions: [{ id: 2 }],
                times: [],
                thumbnailPath:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
                uploadedBy: "Him",
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("returns a MISSING_VALUE sentinel if the given FmsFile does not have the annotation", () => {
            const fmsFile = {
                annotations: [
                    {
                        name: "Cell Line",
                        values: ["AICS_10", "AICS_12"],
                    },
                    {
                        name: "isImage",
                        values: [true],
                    },
                    {
                        name: "Days Since Last Seen Light",
                        values: [932829],
                    },
                ],
                channels: [],
                fileId: "abc123",
                fileName: "mockfile.png",
                filePath: "some/path/to/mockfile.png",
                fileSize: 1,
                fileType: "text",
                positions: [{ id: 2 }],
                times: [{ id: 1 }],
                thumbnailPath:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
                uploadedBy: "Me",
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal(Annotation.MISSING_VALUE);
        });
    });
});
