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
            const nextSelection = selection.select(new FileSet(), 3);

            // Assert
            expect(nextSelection.isSelected(new FileSet(), 3)).equals(true);
        });

        it("selects a file -- multiple", () => {
            // Arrange
            const selection = new FileSelection();

            // Act
            const nextSelection = selection.select(new FileSet(), new NumericRange(3, 7));

            // Assert
            [3, 4, 5, 6, 7].forEach((idx) => {
                expect(nextSelection.isSelected(new FileSet(), idx)).equals(true);
            });
        });

        it("handles a case in which a new selection overlaps with a previous one", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), 4);

            // Act
            const nextSelection = selection.select(new FileSet(), new NumericRange(4, 10));

            // Assert
            expect(nextSelection.isSelected(new FileSet(), 4)).to.equal(true);
        });

        it("makes the new selection focused", () => {
            // Arrange
            const selection = new FileSelection();
            const fileSet = new FileSet();
            const selectedRange = new NumericRange(10, 20);

            // Act
            const nextSelection = selection.select(fileSet, selectedRange);

            // Assert
            expect(nextSelection.isFocused(fileSet, 20)).to.equal(true);
        });

        it("focuses an item within a selection other than the last if explicitly told to", () => {
            // Arrange
            const selection = new FileSelection();
            const fileSet = new FileSet();
            const selectedRange = new NumericRange(10, 20);

            // Act
            const nextSelection = selection.select(fileSet, selectedRange, 12);

            // Assert
            expect(nextSelection.isFocused(fileSet, 12)).to.equal(true);
        });
    });

    describe("deselect", () => {
        it("deselects a single file", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100));

            // Act
            const nextSelection = selection.deselect(new FileSet(), 25);

            // Assert
            expect(selection.isSelected(new FileSet(), 25)).to.equal(true);
            expect(nextSelection.isSelected(new FileSet(), 25)).to.equal(false);
            expect(nextSelection.length).to.equal(selection.length - 1);
        });

        it("deselects multiple files", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100));

            const rangeToDeselect = new NumericRange(22, 30);

            // Act
            const nextSelection = selection.deselect(new FileSet(), rangeToDeselect);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isSelected(new FileSet(), rangeToDeselect)).to.equal(true);

            // deselection
            expect(nextSelection.isSelected(new FileSet(), rangeToDeselect)).to.equal(false);
            expect(nextSelection.length).to.equal(selection.length - rangeToDeselect.length);
        });

        it("produces an empty FileSelection instance if last remaining selection is removed", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(34));

            // Act
            const nextSelection = selection.deselect(new FileSet(), 34);

            // Assert
            expect(nextSelection.length).to.equal(0);
        });

        it("keeps currently focused item if possible", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100))
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
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100))
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
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100))
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
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100));

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
                .select(new FileSet(), new NumericRange(0, 5))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(97, 100))
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
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100))
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
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(97, 100));

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
            .select(fileSet1, new NumericRange(4, 100))
            .select(fileSet2, 77)
            .select(fileSet2, new NumericRange(103, 300))
            .select(fileSet1, 0);

        const spec = [
            {
                directive: FocusDirective.FIRST,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 4,
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
                    fileSetIndex: 4,
                },
            },
            {
                directive: FocusDirective.LAST,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 0,
                },
            },
            // effectively a noop when the focused item is already at LAST
            {
                setup: (selection: FileSelection) => {
                    return selection.focusByIndex(selection.length - 1);
                },
                directive: FocusDirective.NEXT,
                expectation: {
                    fileSet: fileSet1,
                    fileSetIndex: 0,
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
                .select(fileSet1, 48);

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
                .select(fileSet1, new NumericRange(3, 10))
                .select(fileSet2, new NumericRange(1, 5000));

            // Act
            const nextSelection = prevSelection.focusByIndex(3);

            // Assert
            expect(prevSelection.isFocused(new FileSet(), 6)).to.equal(false);
            expect(nextSelection.isFocused(new FileSet(), 6)).to.equal(true);
        });

        it("throws an error if attempting to make an out-of-bounds selection", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0, 45));

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
                .select(fileSet1, new NumericRange(3, 10))
                .select(fileSet2, new NumericRange(1, 5000));

            // Act
            const nextSelection = prevSelection.focusByFileSet(fileSet2, 4086);

            // Assert
            expect(prevSelection.isFocused(fileSet2, 4086)).to.equal(false);
            expect(nextSelection.isFocused(fileSet2, 4086)).to.equal(true);
        });

        it("throws an error if attempting to make an invalid selection -- row within FileSet not selected", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0, 45));

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
                .select(selectedFileSet, new NumericRange(0, 45));

            // Act / Assert
            expect(() => {
                selection.focusByFileSet(notSelectedFileSet, 0)
            }).to.throw(ValueError);
        });
    });
});
