import InvalidArgumentException from "../../exceptions/InvalidArgumentException";
import { FmsFile } from "../../services/FileService";
import FileSet from "../FileSet";
import NumericRange from "../NumericRange";

/**
 * Either a single file row or range of file rows within a given FileSet (i.e., query).
 * File rows are represented by their index position within the FileSet.
 */
export interface SelectionItem {
    fileSet: FileSet;
    selection: NumericRange;
}

/**
 * The selected file row that is current on display in the file details pane.
 */
export interface FocusedItem extends SelectionItem {
    // index local to the FileSet the file row belongs to
    indexWithinFileSet: number;

    // index within list of all selected file rows
    indexAcrossAllSelections: number;
}

/**
 * TODO
 */
export default class FileSelection {
    private focusedItem: FocusedItem | null = null;
    private selections: SelectionItem[];

    /**
     * Immutability helper. Shallow copy a Selection instance.
     */
    public static from(selection: FileSelection): FileSelection {
        return new FileSelection(selection.selections, selection.focusedItem);
    }

    public constructor(selections: SelectionItem[] = [], focusedItem: FocusedItem | null = null) {
        this.selections = selections;
        this.focusedItem = focusedItem;
    }

    /**
     * How many file rows are selected
     */
    public get length(): number {
        return this.selections.reduce((length: number, item: SelectionItem) => {
            return length + item.selection.length;
        }, 0);
    }

    /**
     * Is the given index or range of indices within the given FileSet selected?
     */
    public isSelected(fileSet: FileSet, index: NumericRange | number): boolean {
        return this.selections.some((item) => {
            return item.fileSet.equals(fileSet) && item.selection.contains(index);
        });
    }

    /**
     * Is the given index within the given FileSet focused (i.e., current shown in the file details pane)?
     */
    public isFocused(fileSet: FileSet, index: number): boolean {
        if (!this.focusedItem) {
            return false;
        }

        return this.focusedItem.fileSet.equals(fileSet) && this.focusedItem.indexWithinFileSet === index;
    }

    /**
     * Fetch metadata for currently focused item.
     */
    public async fetchFocusedItemDetails(): Promise<FmsFile | undefined> {
        if (!this.focusedItem) {
            return await Promise.resolve(undefined);
        }
        const { fileSet, indexWithinFileSet } = this.focusedItem;

        if (fileSet.isFileMetadataLoaded(indexWithinFileSet)) {
            return await Promise.resolve(fileSet.getFileByIndex(indexWithinFileSet));
        }

        return (await fileSet.fetchFileRange(indexWithinFileSet, indexWithinFileSet))[0];
    }

    /**
     * Return a new FileSelection instance with the given index (or range of indices) within given FileSet.
     * Defaults to setting currently focused item to index or max(indices) (if index represents a range of indices).
     * Override this default behavior by explicitly providing an `indexToFocus`.
     */
    public select(fileSet: FileSet, index: NumericRange | number, indexToFocus?: number): FileSelection {
        const indexRange = NumericRange.isNumericRange(index) ? index : new NumericRange(index);

        if (!indexToFocus) {
            indexToFocus = indexRange.max;
        }

        let item: SelectionItem = {
            fileSet,
            selection: indexRange
        };
        // keep internal state compact if possible
        if (this.selections.length && this.selections[this.selections.length - 1].fileSet === fileSet) {
            const itemToExpand = this.selections[this.selections.length - 1];
            if (indexRange.abuts(itemToExpand.selection) || indexRange.intersects(itemToExpand.selection)) {
                item = {
                    fileSet,
                    selection: itemToExpand.selection.union(indexRange),
                }
            }
        }

        const focusedItem = {
            fileSet,
            selection: item.selection,
            indexWithinFileSet: indexToFocus,
            indexAcrossAllSelections: this.length + (indexToFocus - item.selection.min),
        };
        const selections = [...this.selections, item];
        return new FileSelection(selections, focusedItem);
    }

    /**
     * Return a new FileSelection instance without the given index (or range of indices) within the given FileSet.
     * If the currently focused item is being deselected, defaults to focusing the selected item that directly
     * precedes the currently focused item by index across all selected items. If the first item within the list of
     * all selections was focused but is being deselected, focuses whichever file row is first in the new FileSelection
     * instance.
     */
    public deselect(fileSet: FileSet, index: NumericRange | number): FileSelection {
        const indexRange = NumericRange.isNumericRange(index) ? index : new NumericRange(index);

        const indexOfItemContainingSelection = this.selections.findIndex((item) => {
            return item.fileSet.equals(fileSet) && item.selection.contains(indexRange);
        });

        // Somehow attempting to deselect an item that isn't selected. Guard statement
        // here for completeness/typing, not because it's a likely condition to hit.
        if (indexOfItemContainingSelection === -1) {
            return FileSelection.from(this);
        }

        const item = this.selections[indexOfItemContainingSelection];
        const reducedSelection = item.selection.remove(indexRange);

        const nextSelections = [...this.selections];
        if (!reducedSelection.length) {
            nextSelections.splice(indexOfItemContainingSelection, 1);
        } else {
            const nextItems = reducedSelection.map((selection) => {
                return {
                    fileSet,
                    selection,
                };
            })
            nextSelections.splice(indexOfItemContainingSelection, 1, ...nextItems);
        }

        const nextSelection = new FileSelection(nextSelections);

        // Nothing was initially focused (not plausible within this code path),
        // or there are no remaining file selections (perfectly plausible)
        if (!this.focusedItem || !nextSelection.length) {
            return nextSelection;
        }

        // The currently focused item lies before anything that was just removed.
        // Therefore, it's index position within the new selection is unchanged.
        const relativeStartIndexForItem = this.relativeStartIndexForItem(item);
        if (this.focusedItem.indexAcrossAllSelections < relativeStartIndexForItem) {
            return nextSelection.focusByIndex(this.focusedItem.indexAcrossAllSelections);
        }

        // Otherwise, the currently focused item is after what was just removed. Need to either:
        //   a. Update index references for currently focused item if it's still valid, or
        //   b. Choose a new item to focus
        // Case a: the currently focused item is still in the list of selections, need to update index references
        if (nextSelection.isSelected(this.focusedItem.fileSet, this.focusedItem.indexWithinFileSet)) {
            return nextSelection.focusByFileSet(this.focusedItem.fileSet, this.focusedItem.indexWithinFileSet);
        }

        // Case b: the currently focused item has just been deselected; need to focus something else
        //     Case b.i: the currently focused item is the first item in the list of all selections,
        //     select whatever is first in the next selection set
        if (this.focusedItem.indexAcrossAllSelections === 0) {
            return nextSelection.focusByIndex(0);
        }

        // Case b.ii: the currently focused item is not the first item; focus whatever immediately precedes
        // what was just deselected within the list of all selections
        const indexWithinFileSetOfDeselectionMin = indexRange.min - item.selection.min;
        const nextFocusedIndexAcrossAllSelections = Math.max(0, relativeStartIndexForItem + indexWithinFileSetOfDeselectionMin - 1);
        const nextItemToFocus = this.getItemContainingSelectionIndex(nextFocusedIndexAcrossAllSelections);
        const relativeStartIndexForNextFocusedItem = this.relativeStartIndexForItem(nextItemToFocus);
        const offset = nextFocusedIndexAcrossAllSelections - relativeStartIndexForNextFocusedItem;
        const indexWithinFileSet = nextItemToFocus.selection.min + offset;
        return nextSelection.focusByFileSet(nextItemToFocus.fileSet, indexWithinFileSet);
    }

    /**
     * Return a new FileSelection instance with the given index across entire list of selections
     * (i.e., not local to a particular FileSet) focused.
     */
    public focusByIndex(indexAcrossAllSelections: number): FileSelection {
        const itemToFocus = this.getItemContainingSelectionIndex(indexAcrossAllSelections);
        const relativeStartIndexForItem = this.relativeStartIndexForItem(itemToFocus);
        const nextFocusedItem = {
            fileSet: itemToFocus.fileSet,
            selection: itemToFocus.selection,
            indexWithinFileSet: itemToFocus.selection.min + (indexAcrossAllSelections - relativeStartIndexForItem),
            indexAcrossAllSelections,
        };

        return new FileSelection(this.selections, nextFocusedItem);
    }

    /**
     * Return a new FileSelection instance with the the file row within the given FileSet
     * focused.
     */
    public focusByFileSet(fileSet: FileSet, indexWithinFileSet: number): FileSelection {
        const indexOfItemContainingSelection = this.selections.findIndex((item) => {
            return item.fileSet.equals(fileSet) && item.selection.contains(indexWithinFileSet);
        });

        // attempting to focus an item that isn't selected; fail gracefully
        if (indexOfItemContainingSelection === -1) {
            return FileSelection.from(this);
        }

        const item = this.selections[indexOfItemContainingSelection];
        const relativeStartIndexForItem = this.relativeStartIndexForItem(item);
        const nextFocusedItem = {
            fileSet,
            selection: item.selection,
            indexWithinFileSet,
            indexAcrossAllSelections: relativeStartIndexForItem + (indexWithinFileSet - item.selection.min),
        };

        return new FileSelection(this.selections, nextFocusedItem);
    }

    public toJSON() {
        return {
            selections: this.selections,
            focusedItem: this.focusedItem,
        }
    }

    public toString(): string {
        return `FileSelection(${JSON.stringify(this)})`;
    }

    /**
     * Get selection item (which may represent a single file row within a FileSet,
     * or may represent a range of file rows within a FileSet) that contains given
     * index across all selections.
     */
    private getItemContainingSelectionIndex(indexAcrossAllSelections: number): SelectionItem {
        for (let i = 0; i < this.selections.length; i++) {
            const item = this.selections[i];
            const relativeStartIndexForItem = this.relativeStartIndexForItem(item);
            if (relativeStartIndexForItem + item.selection.length > indexAcrossAllSelections) {
                return item;
            }
        }

        throw new InvalidArgumentException(
            `${indexAcrossAllSelections} is out of bounds of ${this}`
        );
    }

    /**
     * Determine start index within list of all selected file rows for Item, which represents
     * either a single file row or range of file rows within a FileSet.
     */
    private relativeStartIndexForItem(item: SelectionItem): number {
        const indexOfItem = this.selections.findIndex((i) => {
            return i.fileSet.equals(item.fileSet) && i.selection.intersects(item.selection);
        });

        if (indexOfItem === -1) {
            throw new Error(
                "Cannot determine a relative start index for an item that is not represented in selections"
            );
        }

        const upToItem = this.selections.slice(0, indexOfItem);
        return upToItem.reduce((length: number, item: SelectionItem) => {
            return length + item.selection.length;
        }, 0);
    }
}
