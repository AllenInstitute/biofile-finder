import { expect } from "chai";
import { compact, find } from "lodash";

import Annotation from "../";
import { AnnotationType } from "../../AnnotationFormatter";
import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";

describe("Annotation", () => {
    const annotationResponse = Object.freeze({
        annotationDisplayName: "Date uploaded",
        annotationName: "someDateAnnotation",
        description: "Date the file was uploaded",
        type: AnnotationType.DATETIME,
    });

    describe("sort", () => {
        const asdf = new Annotation({
            annotationDisplayName: "asdf", // n.b.: lower case
            annotationName: "asdf",
            description: "asdf",
            type: AnnotationType.STRING,
        });

        const fileType = find(
            TOP_LEVEL_FILE_ANNOTATIONS,
            (annotation) => annotation.name === AnnotationName.FILE_NAME
        );

        const cellLine = new Annotation({
            annotationDisplayName: "Cell Line",
            annotationName: "Cell Line",
            description: "Cell line",
            type: AnnotationType.STRING,
        });

        const gene = new Annotation({
            annotationDisplayName: "Gene",
            annotationName: "Gene",
            description: "Gene",
            type: AnnotationType.STRING,
        });

        it("defaults to alpha order", () => {
            // arrange / act
            const sorted = Annotation.sort([gene, cellLine, asdf]);

            // assert
            expect(sorted).to.deep.equal([asdf, cellLine, gene]);
        });

        it("orders top-level 'annotations' (née 'attributes') ahead of other annotations", () => {
            // arrange
            const input = compact([gene, fileType, cellLine]);

            // act
            const sorted = Annotation.sort(input);

            // assert
            expect(sorted).to.deep.equal([fileType, cellLine, gene]);
        });
    });

    describe("extractFromFile", () => {
        it("gets the display value for a top-level annotation it represents from a given FmsFile", () => {
            const fmsFile = {
                annotations: [
                    {
                        name: "Cell Line",
                        values: ["AICS_10", "AICS_12"],
                    },
                ],
                channels: [],
                file_id: "abc123",
                file_name: "mockfile.png",
                file_path: "some/path/to/mockfile.png",
                file_size: 1,
                positions: [],
                someDateAnnotation: "2019-05-17T07:43:55.205Z",
                times: [],
                thumbnail:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
                uploaded_by: "Her",
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
                file_id: "abc123",
                file_name: "mockfile.text",
                file_path: "some/path/to/mockfile.png",
                file_size: 1,
                positions: [{ id: 2 }],
                times: [],
                thumbnailPath:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
                uploaded_by: "Him",
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
                file_id: "abc123",
                file_name: "mockfile.png",
                file_path: "some/path/to/mockfile.png",
                file_size: 1,
                positions: [{ id: 2 }],
                times: [{ id: 1 }],
                thumbnail:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
                uploaded_by: "Me",
            };

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal(Annotation.MISSING_VALUE);
        });
    });
});
