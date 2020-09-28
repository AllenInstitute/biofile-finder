import { expect } from "chai";

import FileSet from "../../FileSet";
import NumericRange from "../../NumericRange";

import FileSelection from "..";

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
            expect(selection.isSelected(new FileSet(), rangeToDeselect)).to.equal(true);
            expect(nextSelection.isSelected(new FileSet(), rangeToDeselect)).to.equal(false);
            expect(nextSelection.length).to.equal(selection.length - rangeToDeselect.length);
        });

        it("keeps currently focused item if possible", () => {
            // Arrange
            const selection = new FileSelection()
                .select(new FileSet(), new NumericRange(0))
                .select(new FileSet(), new NumericRange(21, 30))
                .select(new FileSet(), new NumericRange(100))
                .focusBySelectionIndex(1);

            // Act
            const nextSelection = selection.deselect(new FileSet(), 100);

            // Assert
            // sanity-checks: previous selection
            expect(selection.isFocused(new FileSet(), 21)).to.equal(true);

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
            expect(nextSelection.isFocused(new FileSet(), 26)).to.equal(true);
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
            expect(nextSelection.isFocused(new FileSet(), 100)).to.equal(true);
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
});
