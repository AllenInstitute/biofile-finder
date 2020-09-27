import { FmsFile } from "../../services/FileService";
import FileSet from "../FileSet";
import NumericRange from "../NumericRange";

export enum SelectionDirective {
    NEXT,
    PREVIOUS,
    FIRST,
    LAST,
}

export interface Item {
    fileSet: FileSet;
    selection: NumericRange;
}

export interface FocusedItem extends Item {
    indexWithinFileSet: number;
    indexAcrossAllSelections: number;
}

export default class FileSelection {
    private _focusedItem: FocusedItem | null = null;
    private selections: Item[];

    /**
     * Immutability helper. Shallow copy a Selection instance.
     */
    public static from(selection: FileSelection): FileSelection {
        return new FileSelection(selection.selections, selection._focusedItem);
    }

    public constructor(selections: Item[] = [], focusedItem: FocusedItem | null = null) {
        this.selections = selections;
        this._focusedItem = focusedItem;
    }

    public get length(): number {
        return this.selections.reduce((length: number, item: Item) => {
            return length + item.selection.length;
        }, 0);
    }

    public get focusedItem(): FocusedItem | null {
        return this._focusedItem;
    }

    public isSelected(fileSet: FileSet, selection: NumericRange | number): boolean {
        return this.selections.some((item) => {
            return item.fileSet.equals(fileSet) && item.selection.contains(selection);
        });
    }

    public async getFocusedItemDetails(): Promise<FmsFile | undefined> {
        if (!this._focusedItem) {
            return await Promise.resolve(undefined);
        }
        const { fileSet, indexWithinFileSet } = this._focusedItem;

        if (fileSet.isFileMetadataLoaded(indexWithinFileSet)) {
            return await Promise.resolve(fileSet.getFileByIndex(indexWithinFileSet));
        }

        return (await fileSet.fetchFileRange(indexWithinFileSet, indexWithinFileSet))[0];
    }

    public select(fileSet: FileSet, selection: NumericRange | number, lastTouchedIndex?: number): FileSelection {
        if (!NumericRange.isNumericRange(selection)) {
            selection = new NumericRange(selection);
        }

        if (!lastTouchedIndex) {
            lastTouchedIndex = selection.max;
        }

        let item: Item = {
            fileSet,
            selection
        };
        // keep internal state compact if possible
        if (this.selections.length && this.selections[this.selections.length - 1].fileSet === fileSet) {
            const itemToExpand = this.selections[this.selections.length - 1];
            if (selection.abuts(itemToExpand.selection) || selection.intersects(itemToExpand.selection)) {
                item = {
                    fileSet,
                    selection: itemToExpand.selection.union(selection),
                }
            }
        }

        const focusedItem = {
            fileSet,
            selection: item.selection,
            indexWithinFileSet: lastTouchedIndex,
            indexAcrossAllSelections: this.length + item.selection.length - 1,
        };
        const selections = [...this.selections, item];
        return new FileSelection(selections, focusedItem);
    }

    public deselect(fileSet: FileSet, selection: NumericRange | number): FileSelection {
        const indexOfItemContainingSelection = this.selections.findIndex((item) => {
            return item.fileSet.equals(fileSet) && item.selection.contains(selection);
        });

        // Somehow attempting to deselect an item that isn't selected. Guard statement
        // here for completeness/typing, not because it's a likely condition to hit.
        if (indexOfItemContainingSelection === -1) {
            return FileSelection.from(this);
        }

        const item = this.selections[indexOfItemContainingSelection];
        const reducedSelection = item.selection.extract(selection);

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

        // Case: nothing was initially focused (not plausible within this code path),
        // or there are no remaining file selections
        if (!this._focusedItem || !nextSelection.length) {
            return nextSelection;
        }

        // Case: the currently focused item lies before anything that was just removed.
        // Therefore, it's index position within the new selection is unchanged.
        const relativeStartIndexForItem = this.relativeStartIndexForItem(item);
        if (this._focusedItem.indexAcrossAllSelections < relativeStartIndexForItem) {
            return nextSelection.focusBySelectionIndex(this._focusedItem.indexAcrossAllSelections);
        }

        // Otherwise, the currently focused item is after what was just removed. Need to either:
        //   a. Update index references for currently focused item if it's still valid, or
        //   b. Choose a new item to focus
        // a: the currently focused item is still in the list of selections, need to update index references
        if (nextSelection.isSelected(this._focusedItem.fileSet, this._focusedItem.indexWithinFileSet)) {
            return nextSelection.focusByFileSet(this._focusedItem.fileSet, this._focusedItem.indexWithinFileSet);
        }

        // b: the currently focused item has just been deselected; need to focus something else
        //  b.i: the currently focused item was the last item
        if (this._focusedItem.indexAcrossAllSelections === this.length - 1) {
            const itemContainingLastSelection = nextSelection.getItemContainingSelectionIndex(nextSelection.length - 1);
            return nextSelection.focusByFileSet(itemContainingLastSelection.fileSet, itemContainingLastSelection.selection.max);
        }

        //  b.ii: the currently focused item was not the last item
        const delta = NumericRange.isNumericRange(selection)
            ? selection.max - item.selection.min
            : selection - item.selection.min;

        const nextSelectedIdx = relativeStartIndexForItem + delta + 1;
        const itemToFocus = this.getItemContainingSelectionIndex(nextSelectedIdx);
        const relativeStartIndexForItem2 = this.relativeStartIndexForItem(itemToFocus);
        const offset = nextSelectedIdx - relativeStartIndexForItem2;
        const indexWithinFileSet = itemToFocus.selection.min + offset;
        return nextSelection.focusByFileSet(itemToFocus.fileSet, indexWithinFileSet);
    }

    public focusBySelectionIndex(indexAcrossAllSelections: number): FileSelection {
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

    public focusByFileSet(fileSet: FileSet, indexWithinFileSet: number): FileSelection {
        const indexOfItemContainingSelection = this.selections.findIndex((item) => {
            return item.fileSet.equals(fileSet) && item.selection.contains(indexWithinFileSet);
        });

        // somehow, we're attempting to focus an item that isn't selected
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

    private getItemContainingSelectionIndex(index: number): Item {
        for (let i = 0; i < this.selections.length; i++) {
            const item = this.selections[i];
            const relativeStartIndexForItem = this.relativeStartIndexForItem(item);
            if (relativeStartIndexForItem + item.selection.length > index) {
                return item;
            }
        }
    }

    private relativeStartIndexForItem(item: Item): number {
        const indexOfItem = this.selections.findIndex((i) => {
            return i.fileSet.equals(item.fileSet) && i.selection.intersects(item.selection);
        });

        if (indexOfItem === -1) {
            throw new Error(
                "Cannot determine a relative start index for an item that is not represented in selections"
            );
        }

        const upToItem = this.selections.slice(0, indexOfItem);
        if (!upToItem.length) {
            return 0;
        }

        return upToItem.reduce((length: number, item: Item) => {
            return length + item.selection.length;
        }, 0);
    }
}
