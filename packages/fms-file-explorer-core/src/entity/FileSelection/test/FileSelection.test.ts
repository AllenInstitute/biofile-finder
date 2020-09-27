import { expect } from "chai";

import FileSet from "../../FileSet";
import NumericRange from "../../NumericRange";

import FileSelection, { FocusedItem } from "..";

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

        it("makes the new selection focused", () => {
            // Arrange
            const selection = new FileSelection();
            const fileSet = new FileSet();
            const selectedRange = new NumericRange(10, 20);
            const expectedFocusedItem: FocusedItem = {
                fileSet: fileSet,
                selection: selectedRange,
                indexWithinFileSet: 20,
                indexAcrossAllSelections: 10
            };

            // Act
            const nextSelection = selection.select(fileSet, selectedRange);

            // Assert
            expect(nextSelection.focusedItem).to.deep.equal(expectedFocusedItem);
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
            expect(selection.focusedItem?.indexWithinFileSet).to.equal(21);
            expect(selection.focusedItem?.indexAcrossAllSelections).to.equal(1);

            // deselection:
            expect(nextSelection.focusedItem?.indexWithinFileSet).to.equal(21);
            expect(nextSelection.focusedItem?.indexAcrossAllSelections).to.equal(1);
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
            expect(selection.focusedItem?.indexWithinFileSet).to.equal(25);
            expect(selection.focusedItem?.indexAcrossAllSelections).to.equal(5);

            // deselection:
            expect(nextSelection.focusedItem?.indexWithinFileSet).to.equal(26);
            expect(nextSelection.focusedItem?.indexAcrossAllSelections).to.equal(5);
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
            expect(selection.focusedItem?.indexWithinFileSet).to.equal(100);
            expect(selection.focusedItem?.indexAcrossAllSelections).to.equal(11);

            // deselection:
            expect(nextSelection.focusedItem?.indexWithinFileSet).to.equal(30);
            expect(nextSelection.focusedItem?.indexAcrossAllSelections).to.equal(10);
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
            expect(selection.focusedItem?.indexWithinFileSet).to.equal(25);
            expect(selection.focusedItem?.indexAcrossAllSelections).to.equal(5);

            // deselection:
            expect(nextSelection.focusedItem?.indexWithinFileSet).to.equal(100);
            expect(nextSelection.focusedItem?.indexAcrossAllSelections).to.equal(2);
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
            expect(selection.focusedItem?.indexWithinFileSet).to.equal(100);
            expect(selection.focusedItem?.indexAcrossAllSelections).to.equal(14);

            // deselection:
            expect(nextSelection.focusedItem?.indexWithinFileSet).to.equal(30);
            expect(nextSelection.focusedItem?.indexAcrossAllSelections).to.equal(10);
        });
    });
});
