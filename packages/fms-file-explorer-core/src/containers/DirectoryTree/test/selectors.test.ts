import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { every, isEqualWith } from "lodash";
import * as sinon from "sinon";

import FileFilter from "../../../entity/FileFilter";
import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import { getDirectoryTree, getFileFilters, getGroupedFileSets, TreeNode } from "../selectors";
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

    describe("getGroupedFileSets", () => {
        afterEach(() => {
            sinon.restore();
        });

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

            assertDeepEquals(getGroupedFileSets(state), expected);
        });

        it("returns a list with a null group key and a single, filterless FileSet if no annotation hierarchy has been specified", () => {
            const expected = [[null, [new FileSet()]]];

            assertDeepEquals(getGroupedFileSets(initialState), expected);
        });
    });

    describe("getDirectoryTree", () => {
        const assertDeepEquals = (
            actual: Map<number, TreeNode>,
            expected: Map<number, TreeNode>
        ) => {
            expect(actual.size).to.equal(expected.size);
            for (const [index, treeNode] of actual.entries()) {
                expect(
                    isEqualWith(
                        treeNode,
                        expected.get(index),
                        (actualTreeNode: TreeNode, expectedTreeNode: TreeNode): boolean => {
                            return every(actualTreeNode, (actualNodeValue, nodeProperty) => {
                                const expectedNodeValue =
                                    expectedTreeNode[nodeProperty as keyof TreeNode];
                                if (actualNodeValue instanceof FileSet) {
                                    if (expectedNodeValue instanceof FileSet) {
                                        return actualNodeValue.equals(expectedNodeValue);
                                    }
                                    return false;
                                } else {
                                    return actualNodeValue === expectedNodeValue;
                                }
                            });
                        }
                    )
                ).to.equal(true);
            }
        };

        it("returns a mapping between index position and TreeNodes", () => {
            sinon.stub(annotations[0], "values").get(() => ["a", "b"]);
            sinon.stub(annotations[1], "values").get(() => [true, false]);
            sinon.stub(annotations[2], "values").get(() => [3]);

            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 3), // n.b., end not inclusive
                },
            });

            const expected: Map<number, TreeNode> = new Map([
                [0, { depth: 0, dir: "a", isLeaf: false, isRoot: false, parent: null }],
                [1, { depth: 1, dir: true, isLeaf: false, isRoot: false, parent: 0 }],
                [
                    2,
                    {
                        depth: 2,
                        dir: 3,
                        isLeaf: true,
                        isRoot: false,
                        fileSet: new FileSet({ filters: [aFilter, trueFilter, threeFilter] }),
                        parent: 1,
                    },
                ],
                [3, { depth: 1, dir: false, isLeaf: false, isRoot: false, parent: 0 }],
                [
                    4,
                    {
                        depth: 2,
                        dir: 3,
                        isLeaf: true,
                        isRoot: false,
                        fileSet: new FileSet({ filters: [aFilter, falseFilter, threeFilter] }),
                        parent: 3,
                    },
                ],
                [5, { depth: 0, dir: "b", isLeaf: false, isRoot: false, parent: null }],
                [6, { depth: 1, dir: true, isLeaf: false, isRoot: false, parent: 5 }],
                [
                    7,
                    {
                        depth: 2,
                        dir: 3,
                        isLeaf: true,
                        isRoot: false,
                        fileSet: new FileSet({ filters: [bFilter, trueFilter, threeFilter] }),
                        parent: 6,
                    },
                ],
                [8, { depth: 1, dir: false, isLeaf: false, isRoot: false, parent: 5 }],
                [
                    9,
                    {
                        depth: 2,
                        dir: 3,
                        isLeaf: true,
                        isRoot: false,
                        fileSet: new FileSet({ filters: [bFilter, falseFilter, threeFilter] }),
                        parent: 8,
                    },
                ],
            ]);

            assertDeepEquals(getDirectoryTree(state), expected);
        });

        it("works with an empty annotation hierarchy", () => {
            const expected: Map<number, TreeNode> = new Map([
                [
                    0,
                    {
                        depth: 0,
                        dir: null,
                        isLeaf: true,
                        isRoot: true,
                        fileSet: new FileSet(),
                        parent: null,
                    },
                ],
            ]);

            assertDeepEquals(getDirectoryTree(initialState), expected);
        });
    });
});
