import { expect } from "chai";
import { compact, find } from "lodash";

import Annotation from "../";
import AnnotationName from "../AnnotationName";
import { AnnotationType } from "../../AnnotationFormatter";
import dateTimeFormatter from "../../AnnotationFormatter/date-time-formatter";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import FileDetail from "../../FileDetail";

describe("Annotation", () => {
    const annotationResponse = Object.freeze({
        annotationDisplayName: "Date uploaded",
        annotationName: AnnotationName.UPLOADED,
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
            const uploaded = new Date().toISOString();
            const fmsFile = new FileDetail({
                annotations: [
                    {
                        name: "Cell Line",
                        values: ["AICS_10", "AICS_12"],
                    },
                ],
                file_id: "abc123",
                file_name: "mockfile.png",
                file_path: "some/path/to/mockfile.png",
                file_size: 1,
                thumbnail:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded,
            });

            const annotation = new Annotation(annotationResponse);
            expect(annotation.extractFromFile(fmsFile)).to.equal(
                dateTimeFormatter.displayValue(uploaded)
            );
        });

        it("gets the display value for a non-top-level annotation it represents from a given FmsFile", () => {
            const someDateAnnotation = {
                annotationDisplayName: "Some Date",
                annotationName: "someDateAnnotation",
                description: "Some date",
                type: AnnotationType.DATETIME,
            };

            const fmsFile = new FileDetail({
                annotations: [
                    {
                        name: "someDateAnnotation",
                        values: ["2019-05-17T07:43:55.205Z"],
                    },
                ],
                file_id: "abc123",
                file_name: "mockfile.text",
                file_path: "some/path/to/mockfile.png",
                file_size: 1,
                thumbnail:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
            });

            const annotation = new Annotation(someDateAnnotation);
            expect(annotation.extractFromFile(fmsFile)).to.equal("5/17/2019, 12:43:55 AM");
        });

        it("returns a MISSING_VALUE sentinel if the given FmsFile does not have the annotation", () => {
            const missingAnnotation = {
                annotationDisplayName: "Nothing Here",
                annotationName: "Nothing Here",
                description: "Nothing Here",
                type: AnnotationType.STRING,
            };

            const fmsFile = new FileDetail({
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
                file_id: "abc123",
                file_name: "mockfile.png",
                file_path: "some/path/to/mockfile.png",
                file_size: 1,
                thumbnail:
                    "https://s3-us-west-2.amazonaws.com/production.imsc-visual-essay.allencell.org/assets/Cell-grid-images-144ppi/ACTB_Interphase.png",
                uploaded: new Date().toISOString(),
            });

            const annotation = new Annotation(missingAnnotation);
            expect(annotation.extractFromFile(fmsFile)).to.equal(Annotation.MISSING_VALUE);
        });
    });
});
