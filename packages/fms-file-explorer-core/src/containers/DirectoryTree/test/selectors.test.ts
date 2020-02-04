import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { isEqualWith } from "lodash";
import * as sinon from "sinon";

import FileFilter from "../../../entity/FileFilter";
import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import { getFileFilters } from "../selectors";
import { initialState } from "../../../state";

describe("FileList selectors", () => {
    const annotations: Annotation[] = annotationsJson.map(
        (annotation) => new Annotation(annotation)
    );

    const aFilter = new FileFilter(annotations[0].name, "a");
    const bFilter = new FileFilter(annotations[0].name, "b");
    const cFilter = new FileFilter(annotations[0].name, "c");
    const trueFilter = new FileFilter(annotations[1].name, true);
    const falseFilter = new FileFilter(annotations[1].name, false);
    const oneFilter = new FileFilter(annotations[2].name, 1);
    const twoFilter = new FileFilter(annotations[2].name, 2);
    const threeFilter = new FileFilter(annotations[2].name, 3);

    describe("getFileFilters", () => {
        afterEach(() => {
            sinon.restore();
        });

        /**
         * Assert that the actual nested list of FileFilters equals the expected list.
         * Asserts first that the length of `actual` and `expected` are the same.
         *
         * Next, walk through `actual`, and for each nested FileFilter list, assert that each one "deep equals"
         * its corresponding list in `expected`.
         */
        const assertDeepEquals = (actual: FileFilter[][], expected: FileFilter[][]) => {
            expect(actual.length).to.equal(expected.length);

            actual.forEach((a, index) => {
                expect(
                    isEqualWith(
                        a,
                        expected[index],
                        (actualFilters: FileFilter[], expectedFilters: FileFilter[]) => {
                            return (
                                actualFilters.length === expectedFilters.length &&
                                actualFilters.every((filter, index) =>
                                    filter.equals(expectedFilters[index])
                                )
                            );
                        }
                    )
                ).to.be.true;
            });
        };

        it("projects annotations into a list of FileFilters for each of their annotation values", () => {
            sinon.stub(annotations[0], "values").get(() => ["a", "b", "c"]);
            sinon.stub(annotations[1], "values").get(() => [true, false]);
            sinon.stub(annotations[2], "values").get(() => [1, 2, 3]);

            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3), // n.b., end not inclusive
                },
            });

            const actual = getFileFilters(state);
            const expected = [
                [aFilter, bFilter, cFilter],
                [trueFilter, falseFilter],
                [oneFilter, twoFilter, threeFilter],
            ];

            assertDeepEquals(actual, expected);
        });

        it("works when only one annotation is part of the hierarchy", () => {
            sinon.stub(annotations[0], "values").get(() => ["a", "b", "c"]);

            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    annotationHierarchy: [annotations[0]],
                },
            });

            const actual = getFileFilters(state);
            const expected = [[aFilter, bFilter, cFilter]];

            assertDeepEquals(actual, expected);
        });

        it("returns an empty array when no annotations are part of the annotation hierarchy", () => {
            const fileFilters = getFileFilters(initialState);
            expect(fileFilters)
                .to.be.an("array")
                .of.length(0);
        });

        it("only includes FileFilters for those annotations in the hierarchy for which we have values", () => {
            sinon.stub(annotations[0], "values").get(() => ["a", "b", "c"]);
            sinon.stub(annotations[1], "values").get(() => []);
            sinon.stub(annotations[2], "values").get(() => []);

            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3), // n.b., end not inclusive
                },
            });

            const actual = getFileFilters(state);
            const expected = [[aFilter, bFilter, cFilter]];

            assertDeepEquals(actual, expected);
        });
    });
});
