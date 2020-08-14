import { expect } from "chai";
import { compact, find } from "lodash";

import selection from "..";
import { initialState } from "../..";
import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";

describe("Selection selectors", () => {
    describe("getOrderedDisplayAnnotations", () => {
        it("orders top-level 'annotations' (née 'attributes') ahead of other annotations", () => {
            // arrange
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

            const state = {
                ...initialState,
                selection: {
                    ...selection.initialState,
                    displayAnnotations: compact([gene, fileType, cellLine]),
                },
            };

            // act
            const sorted = selection.selectors.getOrderedDisplayAnnotations(state);

            // assert
            expect(sorted).to.deep.equal([fileType, cellLine, gene]);
        });

        it("defaults to alpha order", () => {
            // arrange
            const asdf = new Annotation({
                annotationDisplayName: "asdf", // n.b.: lower case
                annotationName: "asdf",
                description: "asdf",
                type: AnnotationType.STRING,
            });

            const cellLine = new Annotation({
                annotationDisplayName: "Cell Line", // n.b.: upper case
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

            const state = {
                ...initialState,
                selection: {
                    ...selection.initialState,
                    displayAnnotations: compact([gene, cellLine, asdf]),
                },
            };

            // act
            const sorted = selection.selectors.getOrderedDisplayAnnotations(state);

            // assert
            expect(sorted).to.deep.equal([asdf, cellLine, gene]);
        });
    });
});
