import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import selection from "..";
import { initialState } from "../..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
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

        it("groups a nested sub-field filter under its full dotted path", () => {
            // arrange
            const annotations = [
                new Annotation({
                    annotationName: ["Well", "Dose", "Unit"],
                    description: "Dose unit",
                    type: AnnotationType.STRING,
                }),
            ];
            const filters = [new FileFilter(["Well", "Dose", "Unit"], "mg", FilterType.DEFAULT)];
            const state = mergeState(initialState, {
                metadata: { annotations },
                selection: { filters },
            });

            // act
            const groupedFilters = selection.selectors.getGroupedByFilterName(state);

            // assert: keyed by the dotted path, with a display value resolved via the
            // full-path entry of the annotation map (not collapsed to the leaf "Unit").
            expect(Object.keys(groupedFilters)).to.deep.equal(["Well.Dose.Unit"]);
            expect(groupedFilters["Well.Dose.Unit"][0].displayValue).to.equal("mg");
        });
    });
});
