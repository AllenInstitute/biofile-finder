import { isArray, reject } from "lodash";

import {
    IndexError,
    ValueError,
 } from "../../errors";
import { FmsFile } from "../../services/FileService";
import FileFilter from "../FileFilter";
import FileSet from "../FileSet";
import NumericRange from "../NumericRange";

/**
 * Enumeration of directives that can be used to change the focus of the FileSelection.
 * "Focus" means which selected file row is displayed in the file details pane.
 */
export enum FocusDirective {
    FIRST = "FIRST",
    PREVIOUS = "PREVIOUS",
    NEXT = "NEXT",
    LAST = "LAST",
}

/**
 * Model for keeping track of either a single file row or range of file rows within a given FileSet (i.e., query).
 * File rows are represented by their index position within the FileSet.
 * Private to this module.
 */
interface SelectionItem {
    fileSet: FileSet;
    selection: NumericRange;
}

/**
 * Model for keeping track of the selected file row that should be on display in the file details pane.
 * Private to this module.
 */
interface FocusedItem extends SelectionItem {
    // index local to the FileSet the file row belongs to
    indexWithinFileSet: number;

    // index within list of all selected file rows
    indexAcrossAllSelections: number;
}

/**
 * Abstraction for keeping track of and modifying file selection.
 *
 * File selections are represented by
 *   1. the FileSet they originate from, which is the query that surfaces the selected rows; and
 *   2. the index within the originating FileSet, used because it is possible and plausible that
 *      a file row can be selected without any metadata for the file being loaded client-side. Such
 *      metadata is lazily loaded. This enables making extremely large selections without having to
 *      know even the file_ids of the selected files.
 *
 * Additionally, this class is responsible for keeping track of which selected file is _focused_,
 * which is the selected file intended to be shown in the file details pane. It exposes a number
 * of methods of modifying the currently focused file.
 *
 * This class is designed to be immutable: all methods that modify state return new FileSelection
 * instances. But note that to conserve memory and time, this class provides only shallow immutability
 * guarantees. That is, if you find a way to reach into the internals of this class' state, you may
 * find object references are shared between two FileSelection instances. Private state is typed such
 * that the compiler should prevent such bugs.
 */
export default class FileSelection {
    private focusedItem: FocusedItem | null = null;
    private selections: SelectionItem[];

    /**
     * Immutability helper. Shallow copy a FileSelection instance. See class docstring for additional
     * commentary on the immutability guarantees of this class.
     */
    public static from(selection: FileSelection): FileSelection {
        return new FileSelection(selection.selections, selection.focusedItem);
    }

    private static getLength(selections: SelectionItem[]): number {
        return selections.reduce((length: number, item: SelectionItem) => {
            return length + item.selection.length;
        }, 0);
    }

    public constructor(selections: SelectionItem[] = [], focusedItem: FocusedItem | null = null) {
        this.selections = selections;
        this.focusedItem = focusedItem;
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
            return Promise.resolve(undefined);
        }
        const { fileSet, indexWithinFileSet } = this.focusedItem;

        if (fileSet.isFileMetadataLoaded(indexWithinFileSet)) {
            return Promise.resolve(fileSet.getFileByIndex(indexWithinFileSet));
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

        // if `indexRange` contains already selected file rows, compact
        const compacted = reject(this.selections, (existingSelectionItem) => {
            return existingSelectionItem.fileSet === fileSet && indexRange.contains(existingSelectionItem.selection);
        });

        const item: SelectionItem = {
            fileSet,
            selection: indexRange,
        };

        const focusedItem: FocusedItem = {
            fileSet,
            selection: item.selection,
            indexWithinFileSet: indexToFocus,
            indexAcrossAllSelections: FileSelection.getLength(compacted) + (indexToFocus - item.selection.min),
        };

        const selections = [...compacted, item];
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
        if (!this.focusedItem || !nextSelection.size()) {
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
     * Return a new FileSelection instance with a newly focused selected item.
     * "Focus" state is used to determine which file is displayed in the file details pane.
     */
    public focus(directive: FocusDirective): FileSelection {
        if (this.size() === 0) {
            return FileSelection.from(this);
        }

        const currentFocusedIndex = this.focusedItem?.indexAcrossAllSelections || 0;

        switch (directive) {
            case FocusDirective.FIRST:
                return FileSelection.from(this)
                    .focusByIndex(0);
            case FocusDirective.PREVIOUS:
                return FileSelection.from(this)
                    .focusByIndex(Math.max(0, currentFocusedIndex - 1));
            case FocusDirective.NEXT:
                return FileSelection.from(this)
                    .focusByIndex(Math.min(this.size() - 1, currentFocusedIndex + 1));
            case FocusDirective.LAST:
                return FileSelection.from(this)
                    .focusByIndex(Math.max(0, this.size() - 1));
            default:
                return FileSelection.from(this);
        }
    }

    /**
     * Return a new FileSelection instance with the given index across entire list of selections
     * (i.e., not local to a particular FileSet) focused.
     */
    public focusByIndex(indexAcrossAllSelections: number): FileSelection {
        if (indexAcrossAllSelections >= this.size()) {
            throw new IndexError(
                `${indexAcrossAllSelections} is out of bounds of ${this}`
            );
        }

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
            throw new ValueError(
                `Unable to find a SelectionItem belonging to FileSet(${JSON.stringify(fileSet)}) and containing ${indexWithinFileSet}`
            );
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
     * How many file rows are selected. This *should not* be used to report how many unique
     * files are selected--two file rows in two different FileSets may represent the same underlying file.
     */
    public size(fileSet: FileSet): number;
    public size(filters: FileFilter[]): number;
    public size(zeroarg?: any | undefined): number;
    public size(args?: FileSet | FileFilter[] | undefined): number {
        let selectionsToCount = this.selections;
        if (FileSet.isFileSet(args)) {
            selectionsToCount = this.selections.filter((selectionItem) => {
                return selectionItem.fileSet.equals(args);
            });
        } else if (isArray(args) && args.every((f) => FileFilter.isFileFilter(f))) {
            selectionsToCount = this.selections.filter((selectionItem) => {
                return selectionItem.fileSet.matches(args);
            });
        }

        return FileSelection.getLength(selectionsToCount);
    }

    /**
     * Return Map view into FileSelection with the SelectionItems
     * grouped by their FileSets and their selections compacted to their most succint representation.
     */
    public groupByFileSet(): Map<FileSet, NumericRange[]> {
        return this.selections.reduce((mapping, selectionItem) => {
            const { fileSet, selection } = selectionItem;
            if (!mapping.has(fileSet)) {
                mapping.set(fileSet, []);
            }

            const existing = mapping.get(fileSet);
            existing.push(selection)
            const compacted = NumericRange.compact(...existing);
            mapping.set(fileSet, compacted);
            return mapping;
        }, new Map());
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

        throw new IndexError(
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
            throw new ValueError(
                "Cannot determine a relative start index for an item that is not represented in selections"
            );
        }

        const upToItem = this.selections.slice(0, indexOfItem);
        return upToItem.reduce((length: number, item: SelectionItem) => {
            return length + item.selection.length;
        }, 0);
    }
}
