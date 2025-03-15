import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import ExcludeFilter from "../../../entity/FileFilter/ExcludeFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";

describe("Selection selectors", () => {
    describe("getGroupedByFilterName", () => {
        it("leaves display value blank for any/none filters regardless of type", () => {
            // arrange
            const annotations = [
                ...TOP_LEVEL_FILE_ANNOTATIONS, // includes string, date and number types
                // Add a boolean-type annotation for testing
                new Annotation({
                    annotationDisplayName: "IsTestAnnotation",
                    annotationName: "IsTestAnnotation",
                    description: "A test annotation of type boolean",
                    type: AnnotationType.BOOLEAN,
                }),
            ];
            const filters = [
                new ExcludeFilter("IsTestAnnotation"), // boolean
                new IncludeFilter(AnnotationName.UPLOADED), // date
                new ExcludeFilter(AnnotationName.FILE_SIZE), // number
                new IncludeFilter(AnnotationName.FILE_NAME), // string
            ];
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    filters,
                },
            });

            // act
            const groupedFilters = selection.selectors.getGroupedByFilterName(state);

            // assert
            Object.values(groupedFilters).forEach((entry) =>
                expect(entry[0].displayValue).to.equal("")
            );
        });
    });
});
