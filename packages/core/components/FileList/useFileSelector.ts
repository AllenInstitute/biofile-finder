import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { selection } from "../../state";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";

export interface EventParams {
    ctrlKeyIsPressed: boolean;
    shiftKeyIsPressed: boolean;
}

export interface OnSelect {
    (fileRow: { index: number; id: string }, eventParams: EventParams): void;
}

/**
 * Custom React hook for dealing with file selection.
 *
 * File selection is complicated by the virtualization and lazy loading of FileSets. Because we don't know file ids
 * for each file in each FileSets ahead of time, bulk selection (e.g., selecting all files in a "folder" and range selection)
 * needs to rely on row indices. Because FileSets are sortable, and because we want to be able to make selections across FileSets,
 * we always need to keep track of which selected indices correspond to which FileSet.
 *
 * This hook contains all logic for working with indices of items in the virtualized, lazily loaded file list, and telling
 * Redux about the user interaction. It returns an `onSelect` handler to be passed to each row. It handles logic for mapping
 * user interactions like ctrl clicking (modify existing selection) and shift clicking (bulk selection).
 */
export default function useFileSelector(fileSet: FileSet, sortOrder: number): OnSelect {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const [lastSelectedFileIndex, setLastSelectedFileIndex] = React.useState<undefined | number>(
        undefined
    );

    // Track whether the most recent fileSelection change was caused by a click in this component.
    // Used to prevent the effect below from overwriting lastSelectedFileIndex in response to
    // click-driven Redux updates (arrow key navigation should update it; clicks handle it directly).
    const isLocalClickPending = React.useRef(false);

    // Sync lastSelectedFileIndex with keyboard-driven navigation (e.g. arrow keys).
    // When the user presses arrow keys to move the selection, the Redux fileSelection changes but
    // the local lastSelectedFileIndex does not, causing a subsequent shift+click to start from the
    // wrong position. Skipping the update for local click events avoids double-setting the value
    // and preserves correct anchor behaviour for consecutive shift+clicks.
    React.useEffect(() => {
        if (isLocalClickPending.current) {
            isLocalClickPending.current = false;
            return;
        }
        const focusedItem = fileSelection.focusedItem;
        if (focusedItem && focusedItem.fileSet.equals(fileSet)) {
            setLastSelectedFileIndex(focusedItem.indexWithinFileSet);
        }
    }, [fileSelection, fileSet]);

    // To be called as an `onSelect` callback by individual FileRows.
    return React.useCallback(
        async (fileRow: { index: number; id: string }, eventParams: EventParams) => {
            isLocalClickPending.current = true;
            if (eventParams.shiftKeyIsPressed) {
                const rangeBoundary =
                    lastSelectedFileIndex === undefined ? fileRow.index : lastSelectedFileIndex;
                const startIndex = Math.min(rangeBoundary, fileRow.index);
                const endIndex = Math.max(rangeBoundary, fileRow.index);

                dispatch(
                    selection.actions.selectFile({
                        fileSet,
                        lastTouched: fileRow.index,
                        selection: new NumericRange(startIndex, endIndex),
                        sortOrder,
                        updateExistingSelection: true, // heuristic: holding down shift key always modifies existing selection
                    })
                );
            } else {
                setLastSelectedFileIndex(fileRow.index);
                dispatch(
                    selection.actions.selectFile({
                        fileSet,
                        selection: fileRow.index,
                        sortOrder,
                        updateExistingSelection: eventParams.ctrlKeyIsPressed,
                    })
                );
            }
        },
        [dispatch, fileSet, lastSelectedFileIndex, sortOrder]
    );
}
