import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { isEqualWith } from "lodash";

import FileFilter from "../../../entity/FileFilter";
import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import { getFileFilters, getFileSetTree } from "../selectors";
import { initialState } from "../../../state";
import FileSet from "../../../entity/FileSet";

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

        it("creates FileFilters for the cartesian product of all annotation values for those annotations that are part of the annotation hierarchy", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                    annotationNameToValuesMap: {
                        [annotations[0].name]: ["a", "b", "c"],
                        [annotations[1].name]: [true, false],
                        [annotations[2].name]: [1, 2, 3],
                    },
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3), // n.b., end not inclusive
                },
            });

            const actual = getFileFilters(state);
            const expected = [
                [aFilter, trueFilter, oneFilter],
                [aFilter, trueFilter, twoFilter],
                [aFilter, trueFilter, threeFilter],
                [aFilter, falseFilter, oneFilter],
                [aFilter, falseFilter, twoFilter],
                [aFilter, falseFilter, threeFilter],
                [bFilter, trueFilter, oneFilter],
                [bFilter, trueFilter, twoFilter],
                [bFilter, trueFilter, threeFilter],
                [bFilter, falseFilter, oneFilter],
                [bFilter, falseFilter, twoFilter],
                [bFilter, falseFilter, threeFilter],
                [cFilter, trueFilter, oneFilter],
                [cFilter, trueFilter, twoFilter],
                [cFilter, trueFilter, threeFilter],
                [cFilter, falseFilter, oneFilter],
                [cFilter, falseFilter, twoFilter],
                [cFilter, falseFilter, threeFilter],
            ];

            assertDeepEquals(actual, expected);
        });

        it("works when only one annotation is part of the hierarchy", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                    annotationNameToValuesMap: {
                        [annotations[0].name]: ["a", "b", "c"],
                    },
                },
                selection: {
                    annotationHierarchy: [annotations[0]],
                },
            });

            const actual = getFileFilters(state);
            const expected = [[aFilter], [bFilter], [cFilter]];

            assertDeepEquals(actual, expected);
        });

        it("returns an empty array when no annotations are part of the annotation hierarchy", () => {
            const fileFilters = getFileFilters(initialState);
            expect(fileFilters)
                .to.be.an("array")
                .of.length(0);
        });

        it("only includes FileFilters for those annotations in the hierarchy for which we have values", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                    annotationNameToValuesMap: {
                        [annotations[0].name]: ["a", "b", "c"],
                    },
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3), // n.b., end not inclusive
                },
            });

            const actual = getFileFilters(state);
            const expected = [[aFilter], [bFilter], [cFilter]];

            assertDeepEquals(actual, expected);
        });
    });

    describe("getFileSetTree", () => {
        /**
         * Recursively assert that the output of `getFileSetTree` equals the expected data structure. Knows how to traverse
         * the data structure and compare its values.
         */
        const assertDeepEquals = (actual: any, expected: any) => {
            if (Array.isArray(actual)) {
                expect(Array.isArray(expected)).to.equal(true);
                expect(actual.length).to.equal(expected.length);
                actual.forEach((val, index) => {
                    assertDeepEquals(val, expected[index]);
                });
            } else if (actual instanceof FileSet) {
                expect(actual.toQueryString()).equals(expected.toQueryString());
            } else {
                expect(actual).to.equal(expected);
            }
        };

        it("groups FileSets according to the annotation hierarchy", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                    annotationNameToValuesMap: {
                        [annotations[0].name]: ["a", "b", "c"],
                        [annotations[1].name]: [true, false],
                        [annotations[2].name]: [1, 2, 3],
                    },
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3), // n.b., end not inclusive
                },
            });

            const expected = [
                [
                    "a",
                    [
                        [
                            true,
                            [
                                [1, [new FileSet({ filters: [aFilter, trueFilter, oneFilter] })]],
                                [2, [new FileSet({ filters: [aFilter, trueFilter, twoFilter] })]],
                                [3, [new FileSet({ filters: [aFilter, trueFilter, threeFilter] })]],
                            ],
                        ],
                        [
                            false,
                            [
                                [1, [new FileSet({ filters: [aFilter, falseFilter, oneFilter] })]],
                                [2, [new FileSet({ filters: [aFilter, falseFilter, twoFilter] })]],
                                [
                                    3,
                                    [new FileSet({ filters: [aFilter, falseFilter, threeFilter] })],
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    "b",
                    [
                        [
                            true,
                            [
                                [1, [new FileSet({ filters: [bFilter, trueFilter, oneFilter] })]],
                                [2, [new FileSet({ filters: [bFilter, trueFilter, twoFilter] })]],
                                [3, [new FileSet({ filters: [bFilter, trueFilter, threeFilter] })]],
                            ],
                        ],
                        [
                            false,
                            [
                                [1, [new FileSet({ filters: [bFilter, falseFilter, oneFilter] })]],
                                [2, [new FileSet({ filters: [bFilter, falseFilter, twoFilter] })]],
                                [
                                    3,
                                    [new FileSet({ filters: [bFilter, falseFilter, threeFilter] })],
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    "c",
                    [
                        [
                            true,
                            [
                                [1, [new FileSet({ filters: [cFilter, trueFilter, oneFilter] })]],
                                [2, [new FileSet({ filters: [cFilter, trueFilter, twoFilter] })]],
                                [3, [new FileSet({ filters: [cFilter, trueFilter, threeFilter] })]],
                            ],
                        ],
                        [
                            false,
                            [
                                [1, [new FileSet({ filters: [cFilter, falseFilter, oneFilter] })]],
                                [2, [new FileSet({ filters: [cFilter, falseFilter, twoFilter] })]],
                                [
                                    3,
                                    [new FileSet({ filters: [cFilter, falseFilter, threeFilter] })],
                                ],
                            ],
                        ],
                    ],
                ],
            ];

            assertDeepEquals(getFileSetTree(state), expected);
        });

        it("returns a list with a null group key and a single, filterless FileSet if no annotation hierarchy has been specified", () => {
            const expected = [null, [new FileSet()]];

            assertDeepEquals(getFileSetTree(initialState), expected);
        });
    });
});
