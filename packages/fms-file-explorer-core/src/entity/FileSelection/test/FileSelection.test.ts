import { expect } from "chai";
import { identity } from "lodash";

import FileSet from "../../FileSet";
import NumericRange from "../../NumericRange";

import FileSelection, { FocusDirective } from "..";
import FileFilter from "../../FileFilter";
import { IndexError, ValueError } from "../../../errors";

describe("FileSelection", () => {
    describe("select", () => {
        it("selects file -- single", () => {
            // Arrange
            const selection = new FileSelection();

            // Act
            const nextSelection = selection.select(new FileSet(), 3, 0);

            // Assert
            expect(nextSelection.isSelected(new FileSet(), 3)).equals(true);
        });

        it("selects a file -- multiple", () => {
            // Arrange
            const selection = new FileSelection();

            // Act
            const nextSelection = selection.select(new FileSet(), new NumericRange(3, 7), 0);

            // Assert
            [3, 4, 5, 6, 7].forEach((idx) => {
                expect(nextSelection.isSelected(new FileSet(), idx)).equals(true);
            });
        });

        it("handles a case in which a new selection overlaps with a previous one", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("Workflow", "Pipeline 10000")],
            });
            const previouslySelectedRange = new NumericRange(30, 60);
            const newlySelectedRange = new NumericRange(4, 100);
            const selection = new FileSelection()
                .select(fileSet1, previouslySelectedRange, 0)
                .select(fileSet2, 88, 1);

            // Act
            const nextSelection = selection.select(fileSet1, newlySelectedRange, 0);

            // Assert
            expect(nextSelection.isSelected(fileSet2, 88)).to.equal(true);
            expect(nextSelection.isSelected(fileSet1, previouslySelectedRange.union(newlySelectedRange))).to.equal(true);
        });

        it("makes the new selection focused", () => {
            // Arrange
            const selection = new FileSelection();
            const fileSet = new FileSet();
            const selectedRange = new NumericRange(10, 20);

            // Act
            const nextSelection = selection.select(fileSet, selectedRange, 0);

            // Assert
            expect(nextSelection.isFocused(fileSet, 20)).to.equal(true);
        });

        it("focuses an item within a selection other than the last if explicitly told to", () => {
            // Arrange
            const selection = new FileSelection();
            const fileSet = new FileSet();
            const selectedRange = new NumericRange(10, 20);

            // Act
            const nextSelection = selection.select(fileSet, selectedRange, 0, 12);

            // Assert
            expect(nextSelection.isFocused(fileSet, 12)).to.equal(true);
        });
    });

    describe("deselect", () => {
        it("deselects a single file", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(100), 0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 25);

            // Assert
            expect(selection.isSelected(new FileSet(), 25)).to.equal(true);
            expect(nextSelection.isSelected(new FileSet(), 25)).to.equal(false);
            expect(nextSelection.size()).to.equal(selection.size() - 1);
        });

        it("deselects multiple files", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(100), 0);

            const rangeToDeselect = new NumericRange(22, 30);

            // Act
            const nextSelection = selection.deselect(new FileSet(), rangeToDeselect);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isSelected(new FileSet(), rangeToDeselect)).to.equal(true);

            // deselection
            expect(nextSelection.isSelected(new FileSet(), rangeToDeselect)).to.equal(false);
            expect(nextSelection.size()).to.equal(selection.size() - rangeToDeselect.length);
        });

        it("produces an empty FileSelection instance if last remaining selection is removed", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(34), 0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 34);

            // Assert
            expect(nextSelection.size()).to.equal(0);
        });

        it("keeps currently focused item if possible", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(100), 0)
                .focusByIndex(1);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 100);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 21)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 21)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - single deselection, first", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(100), 0)
                .focusByIndex(0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 0);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 0)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 21)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - single deselection, middle", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(100), 0)
                .focusByFileSet(new FileSet(), 25);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 25);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 25)).to.equal(true);


            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 24)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - single deselection, last", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(100), 0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 100);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 100)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 30)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - multiple deselection, first", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0, 5), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(97, 100), 0)
                .focusByIndex(0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), new NumericRange(0, 4));

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 0)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 5)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - multiple deselection, middle", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(100), 0)
                .focusByFileSet(new FileSet(), 25);

            // Act
            const nextSelection = selection.deselect(new FileSet(), new NumericRange(22, 30));

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 25)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 21)).to.equal(true);
        });

        it("resets focused item when deselected file was previously focused - multiple deselection, last", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0), 0)
                .select(new FileSet(), new NumericRange(21, 30), 0)
                .select(new FileSet(), new NumericRange(97, 100), 0);

            // Act
            const nextSelection = selection.deselect(new FileSet(), new NumericRange(97, 100));

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 100)).to.equal(true);

            // deselection:
            expect(nextSelection.isFocused(new FileSet(), 30)).to.equal(true);
        });
    });

    describe("focus", () => {
        const fileSet1 = new FileSet();
        const fileSet2 = new FileSet({
            filters: [new FileFilter("Cell Line", "AICS-12")],
        });
        const baseSelection = new FileSelection()
            .select(fileSet1, new NumericRange(4, 100), 0)
            .select(fileSet2, 77, 1)
            .select(fileSet2, new NumericRange(103, 300), 1)
            .select(fileSet1, 0, 0);

        const spec = [
            {
                directive: FocusDirective.FIRST,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 0,
                },
            },
            // effectively a noop when first is already selected
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByIndex(0);
                },
                directive: FocusDirective.PREVIOUS,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 0,
                },
            },
            {
                directive: FocusDirective.LAST,
                expectation: {
                    fileSet: fileSet2,
                    fileSetIndex: 300,
                },
            },
            // effectively a noop when the focused item is already at LAST
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByIndex(selection.size() - 1);
                },
                directive: FocusDirective.NEXT,
                expectation: {
                    fileSet: fileSet2,
                    fileSetIndex: 300,
                },
            },
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByFileSet(fileSet2, 77);
                },
                directive: FocusDirective.NEXT,
                expectation: {
                    fileSet: fileSet2,
                    fileSetIndex: 103,
                },
            },
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByFileSet(fileSet2, 77);
                },
                directive: FocusDirective.PREVIOUS,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 100,
                },
            },
        ];

        spec.forEach(({ setup = identity, directive, expectation }, idx) => {
            it(`(${idx}) focus by directive: ${directive}`, () => {
                // Arrange
                const prevSelection = setup(baseSelection);

                // Act
                const nextSelection = prevSelection?.focus(directive);

                // Assert
                expect(nextSelection?.isFocused(expectation.fileSet, expectation.fileSetIndex)).to.equal(true);
            });
        });

        it("handles FileSelection instances with single selections gracefully", () => {
            // Arrange
            const prevSelection = new FileSelection()
                .select(fileSet1, 48, 0);

            [FocusDirective.FIRST, FocusDirective.PREVIOUS, FocusDirective.NEXT, FocusDirective.LAST].forEach((directive) => {
                // Act
                const nextSelection = prevSelection.focus(directive);

                // Assert
                expect(nextSelection.isFocused(fileSet1, 48)).to.equal(true);
            });
        });
    });

    describe("focusByIndex", () => {
        it("sets a specified selected row as focused", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")]
            });
            const prevSelection = new FileSelection()
                .select(fileSet1, new NumericRange(3, 10), 0)
                .select(fileSet2, new NumericRange(1, 5000), 1);

            // Act
            const nextSelection = prevSelection.focusByIndex(3);

            // Assert
            expect(prevSelection.isFocused(new FileSet(), 6)).to.equal(false);
            expect(nextSelection.isFocused(new FileSet(), 6)).to.equal(true);
        });

        it("throws an error if attempting to make an out-of-bounds selection", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0, 45), 0);

            // Act / Assert
            expect(() => {
                selection.focusByIndex(100)
            }).to.throw(IndexError);
        });
    });

    describe("focusByFileSet", () => {
        it("sets a specified selected row as focused", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")]
            });
            const prevSelection = new FileSelection()
                .select(fileSet1, new NumericRange(3, 10), 0)
                .select(fileSet2, new NumericRange(1, 5000), 1);

            // Act
            const nextSelection = prevSelection.focusByFileSet(fileSet2, 4086);

            // Assert
            expect(prevSelection.isFocused(fileSet2, 4086)).to.equal(false);
            expect(nextSelection.isFocused(fileSet2, 4086)).to.equal(true);
        });

        it("throws an error if attempting to make an invalid selection -- row within FileSet not selected", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0, 45), 0);

            // Act / Assert
            expect(() => {
                selection.focusByFileSet(new FileSet(), 2000)
            }).to.throw(ValueError);
        });

        it("throws an error if attempting to make an invalid selection -- FileSet itself not selected", () => {
            // Arrange
            const selectedFileSet = new FileSet();
            const notSelectedFileSet = new FileSet({
                filters: [new FileFilter("foo", "bar")]
            });
            const selection = new FileSelection()
                .select(selectedFileSet, new NumericRange(0, 45), 0);

            // Act / Assert
            expect(() => {
                selection.focusByFileSet(notSelectedFileSet, 0)
            }).to.throw(ValueError);
        });
    });

    describe("size", () => {
        const pipeline4_4 = new FileFilter("Workflow", "Pipeline 4.4");
        const aics12 = new FileFilter("Cell Line", "AICS-12");
        const fileSet1 = new FileSet();
        const fileSet2 = new FileSet({
            filters: [aics12],
        });
        const fileSet3 = new FileSet({
            filters: [pipeline4_4, aics12],
        });
        const selection = new FileSelection()
            .select(fileSet1, new NumericRange(1, 10), 0) // 10 total
            .select(fileSet2, 3, 1) // 1 total
            .select(fileSet3, new NumericRange(21, 30), 2) // 10 total
            .select(fileSet1, 25, 0); // 1 total

        it("returns unfiltered size", () => {
            // Act
            const size = selection.size();

            // Assert
            expect(size).to.equal(22);
        });

        it("returns filtered size - filtered by fileset", () => {
            // Act
            const size = selection.size(fileSet1);

            // Assert
            expect(size).to.equal(11);
        });

        [
            { filters: [aics12], expected: 11 },
            { filters: [pipeline4_4], expected: 10 },
            { filters: [pipeline4_4, aics12], expected: 10 },
        ].forEach(({ filters, expected }, idx) => {
            it(`(${idx}) returns filtered size -- filtered by file filters`, () => {
                // Act
                const size = selection.size(filters);

                // Assert
                expect(size).to.equal(expected);
            });
        });
    });

    describe("groupByFileSet", () => {
        it("groups selections by filesets", () => {
            // Arrange
            const fileSet1 = new FileSet();
            const fileSet2 = new FileSet({
                filters: [new FileFilter("foo", "bar")]
            });
            const selection = new FileSelection()
                .select(fileSet1, 3, 0)
                .select(fileSet2, new NumericRange(8, 10), 1)
                .select(fileSet1, new NumericRange(12, 15), 0)
                .select(fileSet2, 33, 1);

            // Act
            const grouped = selection.groupByFileSet();

            // Assert
            expect(grouped.size).to.equal(2);
            expect(grouped.has(fileSet1)).to.equal(true);
            expect(grouped.has(fileSet2)).to.equal(true);
            expect(grouped.get(fileSet1)).to.deep.equal([
                new NumericRange(3),
                new NumericRange(12, 15)
            ]);
            expect(grouped.get(fileSet2)).to.deep.equal([
                new NumericRange(8, 10),
                new NumericRange(33)
            ]);
        });

        it("produces the most compact representation of numeric ranges possible", () => {
            // Arrange
            const fileSet = new FileSet();
            const selection = new FileSelection()
                .select(fileSet, 3, 0)
                .select(fileSet, new NumericRange(4, 12), 0)
                .select(fileSet, 15, 0)
                .select(fileSet, new NumericRange(0, 2), 0)
                .select(fileSet, new NumericRange(99, 102), 0);

            // Act
            const grouped = selection.groupByFileSet();

            // Assert
            expect(grouped.get(fileSet)).to.deep.equal([
                new NumericRange(0, 12),
                new NumericRange(15),
                new NumericRange(99, 102),
            ]);
        });
    });

    describe("hasNextFocusableItem", () => {
        const baseSelection = new FileSelection()
            .select(new FileSet(), new NumericRange(0, 9), 0);

        const spec = [
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection
                        .focusByIndex(0);
                },
                expectation: true,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection
                        .focusByIndex(9);
                },
                expectation: false,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection
                        .focusByIndex(5);
                },
                expectation: true,
            },
            {
                // test FileSelection of size 1
                setup: (): FileSelection => {
                    return new FileSelection()
                        .select(new FileSet(), 1, 0)
                        .focusByIndex(0);
                },
                expectation: false,
            },
            {
                // test FileSelection of size 0
                setup: (): FileSelection => {
                    return new FileSelection();
                },
                expectation: false,
            }
        ];

        spec.forEach(({ setup, expectation }, idx) => {
            it(`(${idx}) returns ${expectation}`, () => {
                // Arrange
                const selection = setup(baseSelection);

                // Act
                const hasNext = selection.hasNextFocusableItem();

                // Assert
                expect(hasNext).to.equal(expectation);
            });
        });
    });

    describe("hasPreviousFocusableItem", () => {
        const baseSelection = new FileSelection()
            .select(new FileSet(), new NumericRange(0, 9), 0);

        const spec = [
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection
                        .focusByIndex(0);
                },
                expectation: false,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection
                        .focusByIndex(9);
                },
                expectation: true,
            },
            {
                setup: (selection: FileSelection): FileSelection => {
                    return selection
                        .focusByIndex(5);
                },
                expectation: true,
            },
            {
                // test FileSelection of size 1
                setup: (): FileSelection => {
                    return new FileSelection()
                        .select(new FileSet(), 1, 0)
                        .focusByIndex(0);
                },
                expectation: false,
            },
            {
                // test FileSelection of size 0
                setup: (): FileSelection => {
                    return new FileSelection();
                },
                expectation: false,
            }
        ];

        spec.forEach(({ setup, expectation }, idx) => {
            it(`(${idx}) returns ${expectation}`, () => {
                // Arrange
                const selection = setup(baseSelection);

                // Act
                const hasNext = selection.hasPreviousFocusableItem();

                // Assert
                expect(hasNext).to.equal(expectation);
            });
        });
    });
});
